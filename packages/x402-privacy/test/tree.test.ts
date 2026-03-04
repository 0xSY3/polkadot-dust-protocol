import { describe, it, expect, vi } from "vitest";
import { TreeClient } from "../src/tree/client";

describe("TreeClient", () => {
  it("should parse root response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ root: "12345", leafCount: 10 }),
    });
    globalThis.fetch = mockFetch;

    const client = new TreeClient("http://localhost:3001/tree");
    const result = await client.getRoot();
    expect(result.root).toBe("12345");
    expect(result.leafCount).toBe(10);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:3001/tree/root");
  });

  it("should parse proof response into MerkleProof", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          root: "999",
          pathElements: ["1", "2", "3"],
          pathIndices: [0, 1, 0],
          leafIndex: 5,
        }),
    });
    globalThis.fetch = mockFetch;

    const client = new TreeClient("http://localhost:3001/tree");
    const proof = await client.getProof(5);
    expect(proof.root).toBe(999n);
    expect(proof.pathElements).toEqual([1n, 2n, 3n]);
    expect(proof.pathIndices).toEqual([0, 1, 0]);
  });

  it("should throw on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const client = new TreeClient("http://localhost:3001/tree");
    await expect(client.getRoot()).rejects.toThrow("500");
  });
});
