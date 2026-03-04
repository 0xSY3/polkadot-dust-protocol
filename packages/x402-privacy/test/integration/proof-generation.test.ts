import { describe, it, expect } from "vitest";
import { resolve } from "path";
import {
  poseidonHash,
  computeNoteCommitment,
  computeAssetId,
  computeOwnerPubKey,
  computeNullifier,
  MerkleTree,
} from "../../src/crypto";
import type { NoteV2, NoteCommitmentV2, V2Keys } from "../../src/crypto";
import { buildPaymentInputs, formatCircuitInputs } from "../../src/client/proof-inputs";
import { BN254_FIELD_SIZE, TREE_DEPTH } from "../../src/constants";

const WASM_PATH = resolve(__dirname, "../../circuits/DustV2Transaction.wasm");
const ZKEY_PATH = resolve(__dirname, "../../circuits/DustV2Transaction.zkey");

describe("FFLONK Proof Generation (real circuit)", () => {
  it("should generate a valid FFLONK proof for a withdrawal payment", async () => {
    // #given — construct valid circuit inputs from scratch
    const keys: V2Keys = { spendingKey: 42n, nullifierKey: 99n };
    const owner = await computeOwnerPubKey(keys.spendingKey);
    const chainId = 84532;
    const tokenAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const asset = await computeAssetId(chainId, tokenAddress);

    const depositAmount = 1000000n;
    const paymentAmount = 100000n;
    const blinding = 12345n;

    const note: NoteV2 = { owner, amount: depositAmount, asset, chainId, blinding };
    const commitment = await computeNoteCommitment(note);

    // Build a real Merkle tree and insert the commitment
    const tree = await MerkleTree.create(TREE_DEPTH);
    const leafIndex = await tree.insert(commitment);
    const merkleProof = await tree.getProof(leafIndex);

    const inputNote: NoteCommitmentV2 = {
      note,
      commitment,
      leafIndex,
      spent: false,
    };

    const recipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

    // #when — build proof inputs and generate real FFLONK proof
    const proofInputs = await buildPaymentInputs({
      inputNote,
      paymentAmount,
      recipient,
      keys,
      merkleProof,
      chainId,
    });

    const circuitInputs = formatCircuitInputs(proofInputs);

    // Verify merkle root matches tree
    expect(proofInputs.merkleRoot).toBe(tree.root);

    // Verify balance equation: inAmount[0] + inAmount[1] + publicAmount === outAmount[0] + outAmount[1]
    const inSum = proofInputs.inAmount[0] + proofInputs.inAmount[1];
    const outSum = proofInputs.outAmount[0] + proofInputs.outAmount[1];
    const balanceCheck = (inSum + proofInputs.publicAmount) % BN254_FIELD_SIZE;
    expect(balanceCheck).toBe(outSum % BN254_FIELD_SIZE);

    // Generate real proof with snarkjs
    const snarkjs = await import("snarkjs");
    const { proof, publicSignals } = await snarkjs.fflonk.fullProve(
      circuitInputs,
      WASM_PATH,
      ZKEY_PATH,
    );

    // #then — validate proof output
    expect(proof).toBeDefined();
    expect(publicSignals).toHaveLength(9);

    // Public signals order: [merkleRoot, null0, null1, outC0, outC1, pubAmount, pubAsset, recipient, chainId]
    expect(publicSignals[0]).toBe(proofInputs.merkleRoot.toString());
    expect(publicSignals[1]).toBe(proofInputs.nullifier0.toString());
    expect(publicSignals[2]).toBe(proofInputs.nullifier1.toString());
    expect(publicSignals[3]).toBe(proofInputs.outputCommitment0.toString());
    expect(publicSignals[4]).toBe(proofInputs.outputCommitment1.toString());
    expect(publicSignals[5]).toBe(proofInputs.publicAmount.toString());
    expect(publicSignals[6]).toBe(proofInputs.publicAsset.toString());
    expect(publicSignals[7]).toBe(proofInputs.recipient.toString());
    expect(publicSignals[8]).toBe(proofInputs.chainId.toString());

    // Verify the proof against the verification key
    const vkey = await import("../../circuits/verification_key.json");
    const isValid = await snarkjs.fflonk.verify(vkey, publicSignals, proof);
    expect(isValid).toBe(true);

    // Export calldata and verify format
    const calldata = await snarkjs.fflonk.exportSolidityCallData(publicSignals, proof);
    const hexElements = calldata.match(/0x[0-9a-fA-F]+/g);
    // FFLONK calldata: 24 proof elements + 9 public signal elements
    expect(hexElements).not.toBeNull();
    expect(hexElements!.length).toBeGreaterThanOrEqual(24);

    // Proof bytes should be exactly 768 bytes (24 * 32) when concatenated
    const proofHex = "0x" + hexElements!.slice(0, 24).map((e) => e.slice(2)).join("");
    const proofBytes = (proofHex.length - 2) / 2;
    expect(proofBytes).toBe(768);
  }, 120_000);

  it("should generate a valid proof for exact-amount payment (no change)", async () => {
    // #given — payment amount equals note amount (change = 0)
    const keys: V2Keys = { spendingKey: 7777n, nullifierKey: 8888n };
    const owner = await computeOwnerPubKey(keys.spendingKey);
    const chainId = 84532;
    const asset = await computeAssetId(chainId, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");

    const amount = 500000n;
    const note: NoteV2 = { owner, amount, asset, chainId, blinding: 99999n };
    const commitment = await computeNoteCommitment(note);

    const tree = await MerkleTree.create(TREE_DEPTH);
    const leafIndex = await tree.insert(commitment);
    const merkleProof = await tree.getProof(leafIndex);

    const inputNote: NoteCommitmentV2 = { note, commitment, leafIndex, spent: false };

    // #when — pay the full amount
    const proofInputs = await buildPaymentInputs({
      inputNote,
      paymentAmount: amount,
      recipient: "0x8d56E94a02F06320BDc68FAfE23DEc9Ad7463496",
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

    // #then
    expect(publicSignals).toHaveLength(9);

    const vkey = await import("../../circuits/verification_key.json");
    const isValid = await snarkjs.fflonk.verify(vkey, publicSignals, proof);
    expect(isValid).toBe(true);

    // Change output should be dummy (amount 0)
    expect(proofInputs.outAmount[0]).toBe(0n);
  }, 120_000);
});
