import { describe, it, expect } from "vitest";
import { TreeIndexer } from "../../src/tree/indexer";
import { TREE_DEPTH } from "../../src/constants";

const RPC_URL = "https://sepolia.base.org";
const POOL_ADDRESS = "0x17f52f01ffcB6d3C376b2b789314808981cebb16" as const;
// DustPoolV2 deployed around this block on Base Sepolia
const START_BLOCK = 38350029n;

describe("TreeIndexer (live Base Sepolia)", () => {
  it("should sync DepositQueued events and build Merkle tree", async () => {
    // #given
    const indexer = new TreeIndexer({
      rpcUrl: RPC_URL,
      poolAddress: POOL_ADDRESS,
      startBlock: START_BLOCK,
    });

    // #when
    await indexer.initialize();

    // #then — at least 1 deposit exists (0.001 ETH native deposit)
    expect(indexer.isInitialized()).toBe(true);
    expect(indexer.leafCount).toBeGreaterThanOrEqual(1);
    expect(indexer.root).toBeGreaterThan(0n);

    // Known commitment from the deposit tx (0xfd1622c45b46324d... as decimal)
    const knownCommitment = BigInt("0xfd1622c45b46324dad7953cb360386b66d8ea0e165e6cc4877fd0fbca4155b72").toString();
    const leafIndex = indexer.lookupCommitment(knownCommitment);
    expect(leafIndex).toBeDefined();
    expect(leafIndex).toBe(0);
  }, 30_000);

  it("should generate valid Merkle proofs for indexed leaves", async () => {
    // #given — use a small tree (depth 5) to avoid the O(2^depth) getProof cost
    // The production depth-20 getProof recomputes 1M+ hashes; this verifies logic at small scale
    const { MerkleTree } = await import("../../src/crypto/merkle");
    const tree = await MerkleTree.create(5);
    const commitment = BigInt("0xfd1622c45b46324dad7953cb360386b66d8ea0e165e6cc4877fd0fbca4155b72");
    await tree.insert(commitment);

    // #when
    const proof = await tree.getProof(0);

    // #then
    expect(proof.pathElements).toHaveLength(5);
    expect(proof.pathIndices).toHaveLength(5);
    expect(proof.root).toBe(tree.root);
    expect(proof.pathIndices[0]).toBe(0);
  }, 30_000);
});
