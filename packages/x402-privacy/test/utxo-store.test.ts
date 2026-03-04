import { describe, it, expect } from "vitest";
import { UtxoStore } from "../src/client/utxo-store";
import type { NoteCommitmentV2 } from "../src/crypto";

describe("UtxoStore", () => {
  const makeNote = (amount: bigint, leafIndex: number): NoteCommitmentV2 => ({
    note: { owner: 1n, amount, asset: 42n, chainId: 84532, blinding: BigInt(leafIndex + 100) },
    commitment: BigInt(leafIndex * 1000 + 1),
    leafIndex,
    spent: false,
  });

  it("should add and retrieve notes", () => {
    const store = new UtxoStore();
    store.add(makeNote(100n, 0));
    store.add(makeNote(200n, 1));
    expect(store.getUnspent(42n)).toHaveLength(2);
  });

  it("should select single note when sufficient", () => {
    const store = new UtxoStore();
    store.add(makeNote(100n, 0));
    store.add(makeNote(200n, 1));
    store.add(makeNote(50n, 2));

    const selected = store.selectForAmount(42n, 150n);
    expect(selected).toHaveLength(1);
    expect(selected![0].note.amount).toBe(200n);
  });

  it("should combine two UTXOs when single is insufficient", () => {
    const store = new UtxoStore();
    store.add(makeNote(400n, 0));
    store.add(makeNote(500n, 1));
    store.add(makeNote(300n, 2));

    const selected = store.selectForAmount(42n, 800n);
    expect(selected).toHaveLength(2);
    const total = selected!.reduce((s, n) => s + n.note.amount, 0n);
    expect(total).toBeGreaterThanOrEqual(800n);
  });

  it("should return null when insufficient balance", () => {
    const store = new UtxoStore();
    store.add(makeNote(50n, 0));
    expect(store.selectForAmount(42n, 100n)).toBeNull();
  });

  it("should return null when no pair of UTXOs covers amount", () => {
    const store = new UtxoStore();
    store.add(makeNote(100n, 0));
    store.add(makeNote(100n, 1));
    store.add(makeNote(100n, 2));
    // Best pair = 100+100 = 200, which covers 200
    expect(store.selectForAmount(42n, 200n)).toHaveLength(2);
    // 300 total but best pair = 200 < 250 — circuit only supports 2 inputs
    expect(store.selectForAmount(42n, 250n)).toBeNull();
  });

  it("should mark notes as spent", () => {
    const store = new UtxoStore();
    const note = makeNote(100n, 0);
    store.add(note);
    store.markSpent(note.commitment);
    expect(store.getUnspent(42n)).toHaveLength(0);
  });

  it("should report total balance", () => {
    const store = new UtxoStore();
    store.add(makeNote(100n, 0));
    store.add(makeNote(200n, 1));
    expect(store.getBalance(42n)).toBe(300n);
  });

  it("should export and import notes with bigint preservation", () => {
    const store = new UtxoStore();
    store.add(makeNote(1000n, 0));
    store.add(makeNote(500n, 1));
    store.markSpent(BigInt(1 * 1000 + 1));

    const json = store.export();

    const restored = new UtxoStore();
    restored.import(json);

    expect(restored.size).toBe(2);
    expect(restored.getBalance(42n)).toBe(1000n);
    expect(restored.selectForAmount(42n, 500n)).toHaveLength(1);
  });

  it("should handle empty export/import", () => {
    const store = new UtxoStore();
    const json = store.export();
    const restored = new UtxoStore();
    restored.import(json);
    expect(restored.size).toBe(0);
  });

  it("should clear all notes", () => {
    const store = new UtxoStore();
    store.add(makeNote(1000n, 0));
    store.clear();
    expect(store.size).toBe(0);
    expect(store.getBalance(42n)).toBe(0n);
  });
});
