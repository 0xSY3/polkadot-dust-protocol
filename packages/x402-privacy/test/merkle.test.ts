import { describe, it, expect } from "vitest";
import { MerkleTree } from "../src/crypto/merkle";

describe("MerkleTree", () => {
  it("should create tree with correct depth", async () => {
    const tree = await MerkleTree.create(5);
    expect(tree.leafCount).toBe(0);
    expect(tree.root).toBeGreaterThan(0n);
  });

  it("should insert leaves and update root", async () => {
    const tree = await MerkleTree.create(5);
    const rootBefore = tree.root;
    await tree.insert(12345n);
    expect(tree.root).not.toBe(rootBefore);
    expect(tree.leafCount).toBe(1);
  });

  it("should generate valid Merkle proofs", async () => {
    const tree = await MerkleTree.create(5);
    await tree.insert(111n);
    await tree.insert(222n);
    await tree.insert(333n);

    const proof = await tree.getProof(1);
    expect(proof.pathElements).toHaveLength(5);
    expect(proof.pathIndices).toHaveLength(5);
    expect(proof.root).toBe(tree.root);
  });

  it("should maintain root history", async () => {
    const tree = await MerkleTree.create(5);
    const roots: bigint[] = [];
    for (let i = 0; i < 5; i++) {
      await tree.insert(BigInt(i + 1));
      roots.push(tree.root);
    }
    expect(new Set(roots).size).toBe(5);
  });

  it("should insert multiple leaves at once", async () => {
    const tree = await MerkleTree.create(5);
    await tree.insertMany([100n, 200n, 300n]);
    expect(tree.leafCount).toBe(3);
  });
});
