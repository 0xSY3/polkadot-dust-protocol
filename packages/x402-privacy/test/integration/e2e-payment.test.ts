/**
 * E2E integration test for the @x402/privacy payment flow.
 *
 * Tests against live Base Sepolia DustPoolV2 (0x17f52f01ff...).
 * Does NOT submit a real withdraw transaction (requires onlyRelayer).
 * Instead verifies every component in the pipeline against live on-chain state.
 */
import { describe, it, expect } from "vitest";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { resolve } from "path";
import { TreeIndexer } from "../../src/tree/indexer";
import {
  computeNoteCommitment,
  computeAssetId,
  computeOwnerPubKey,
  MerkleTree,
} from "../../src/crypto";
import type { NoteV2, NoteCommitmentV2, V2Keys } from "../../src/crypto";
import { buildPaymentInputs, formatCircuitInputs } from "../../src/client/proof-inputs";
import { verifyShielded } from "../../src/facilitator/verify";
import { DUST_POOL_V2_ABI, BN254_FIELD_SIZE, TREE_DEPTH } from "../../src/constants";

const POOL_ADDRESS = "0x17f52f01ffcB6d3C376b2b789314808981cebb16" as const;
const RPC_URL = "https://sepolia.base.org";
const WASM_PATH = resolve(__dirname, "../../circuits/DustV2Transaction.wasm");
const ZKEY_PATH = resolve(__dirname, "../../circuits/DustV2Transaction.zkey");

describe("E2E Payment Flow (Base Sepolia)", () => {
  it("should sync tree and match on-chain root", async () => {
    // #given
    const indexer = new TreeIndexer({
      rpcUrl: RPC_URL,
      poolAddress: POOL_ADDRESS,
      startBlock: 38350029n,
    });

    // #when
    await indexer.initialize();
    const localRoot = indexer.root;

    // #then — verify our locally computed root matches on-chain
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const rootHex = ("0x" + localRoot.toString(16).padStart(64, "0")) as `0x${string}`;
    const isKnownRoot = await client.readContract({
      address: POOL_ADDRESS,
      abi: DUST_POOL_V2_ABI,
      functionName: "isKnownRoot",
      args: [rootHex],
    });

    expect(isKnownRoot).toBe(true);
    expect(indexer.leafCount).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it("should generate valid proof and pass facilitator verify checks", async () => {
    // #given — create a test UTXO with known keys
    const keys: V2Keys = { spendingKey: 42n, nullifierKey: 99n };
    const owner = await computeOwnerPubKey(keys.spendingKey);
    const chainId = 84532;
    const asset = await computeAssetId(chainId, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const paymentAmount = 100000n;
    const depositAmount = 1000000n;

    const note: NoteV2 = { owner, amount: depositAmount, asset, chainId, blinding: 12345n };
    const commitment = await computeNoteCommitment(note);

    // Build a local Merkle tree with the test commitment
    const tree = await MerkleTree.create(TREE_DEPTH);
    await tree.insert(commitment);
    const merkleProof = await tree.getProof(0);

    const inputNote: NoteCommitmentV2 = {
      note,
      commitment,
      leafIndex: 0,
      spent: false,
    };

    const recipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

    // #when — generate real FFLONK proof
    const proofInputs = await buildPaymentInputs({
      inputNote,
      paymentAmount,
      recipient,
      keys,
      merkleProof,
      chainId,
    });

    const circuitInputs = formatCircuitInputs(proofInputs);
    const snarkjs = await import("snarkjs");
    const { proof, publicSignals } = await snarkjs.fflonk.fullProve(
      circuitInputs,
      WASM_PATH,
      ZKEY_PATH,
    );

    // Verify proof locally
    const vkey = await import("../../circuits/verification_key.json");
    const isValid = await snarkjs.fflonk.verify(vkey, publicSignals, proof);
    expect(isValid).toBe(true);

    // Format calldata for on-chain consumption
    const calldata = await snarkjs.fflonk.exportSolidityCallData(publicSignals, proof);
    const hexElements = calldata.match(/0x[0-9a-fA-F]+/g);
    const proofHex = ("0x" + hexElements!.slice(0, 24).map((e) => e.slice(2)).join("")) as `0x${string}`;

    // #then — test facilitator verify against live contract
    // The test UTXO's Merkle root is NOT known on-chain (it's a local-only tree),
    // so verify() should return isValid: false with "unknown_merkle_root"
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const mockSigner = {
      getAddresses: () => ["0x8d56E94a02F06320BDc68FAfE23DEc9Ad7463496" as `0x${string}`],
      readContract: (args: { address: `0x${string}`; abi: readonly unknown[]; functionName: string; args?: readonly unknown[] }) =>
        client.readContract(args as never),
      writeContract: async () => "0x" as `0x${string}`,
      waitForTransactionReceipt: async () => ({ status: "success" }),
      verifyTypedData: async () => true,
      sendTransaction: async () => "0x" as `0x${string}`,
      getCode: async () => undefined,
    };

    const payload = {
      payload: {
        proof: proofHex,
        publicSignals: {
          merkleRoot: publicSignals[0],
          nullifier0: publicSignals[1],
          nullifier1: publicSignals[2],
          outputCommitment0: publicSignals[3],
          outputCommitment1: publicSignals[4],
          publicAmount: publicSignals[5],
          publicAsset: publicSignals[6],
          recipient: publicSignals[7],
          chainId: publicSignals[8],
        },
      },
    };

    const requirements = {
      amount: paymentAmount.toString(),
      network: "eip155:84532",
      payTo: recipient,
    };

    // On-chain FFLONK verifier rejects proofs built against local-only trees
    // (proof is valid locally but verifier reverts because the public inputs
    // reference a merkle root the contract doesn't know)
    const result = await verifyShielded(mockSigner, payload, requirements, POOL_ADDRESS);
    expect(result.isValid).toBe(false);
    expect(["invalid_proof", "unknown_merkle_root"]).toContain(result.invalidReason);
  }, 120_000);

  it("should correctly detect unspent nullifiers on-chain", async () => {
    // #given — a random nullifier that has never been used
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    // #when — check a random nullifier
    const randomNullifier = "0x" + "ab".repeat(32);
    const isSpent = await client.readContract({
      address: POOL_ADDRESS,
      abi: DUST_POOL_V2_ABI,
      functionName: "nullifiers",
      args: [randomNullifier as `0x${string}`],
    });

    // #then — should not be spent
    expect(isSpent).toBe(false);
  }, 15_000);

  it("should verify the on-chain root matches our tree indexer", async () => {
    // #given — sync the tree
    const indexer = new TreeIndexer({
      rpcUrl: RPC_URL,
      poolAddress: POOL_ADDRESS,
      startBlock: 38350029n,
    });
    await indexer.initialize();

    // #when — check the on-chain root
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const localRoot = indexer.root;
    const rootHex = ("0x" + localRoot.toString(16).padStart(64, "0")) as `0x${string}`;

    const isKnownRoot = await client.readContract({
      address: POOL_ADDRESS,
      abi: DUST_POOL_V2_ABI,
      functionName: "isKnownRoot",
      args: [rootHex],
    });

    // #then — our local tree root must be recognized by the contract
    expect(isKnownRoot).toBe(true);
  }, 30_000);
});
