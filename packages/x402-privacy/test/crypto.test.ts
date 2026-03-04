import { describe, it, expect } from "vitest";
import {
  poseidonHash,
  computeNoteCommitment,
  computeAssetId,
  computeNullifier,
  createNote,
  createDummyNote,
  generateBlinding,
} from "../src/crypto";
import type { NoteV2 } from "../src/crypto";
import { BN254_FIELD_SIZE } from "../src/constants";

describe("Crypto Primitives", () => {
  describe("poseidonHash", () => {
    it("should produce deterministic output", async () => {
      const a = await poseidonHash([1n, 2n]);
      const b = await poseidonHash([1n, 2n]);
      expect(a).toBe(b);
    });

    it("should produce different output for different inputs", async () => {
      const a = await poseidonHash([1n, 2n]);
      const b = await poseidonHash([1n, 3n]);
      expect(a).not.toBe(b);
    });

    it("should produce output in BN254 field", async () => {
      const result = await poseidonHash([12345n, 67890n]);
      expect(result).toBeGreaterThan(0n);
      expect(result).toBeLessThan(BN254_FIELD_SIZE);
    });
  });

  describe("createNote", () => {
    it("should create note with random blinding", () => {
      const note = createNote(100n, 1000000n, 42n, 84532);
      expect(note.owner).toBe(100n);
      expect(note.amount).toBe(1000000n);
      expect(note.asset).toBe(42n);
      expect(note.chainId).toBe(84532);
      expect(note.blinding).toBeGreaterThan(0n);
      expect(note.blinding).toBeLessThan(BN254_FIELD_SIZE);
    });

    it("should create unique blindings", () => {
      const a = createNote(1n, 1n, 1n, 1);
      const b = createNote(1n, 1n, 1n, 1);
      expect(a.blinding).not.toBe(b.blinding);
    });
  });

  describe("createDummyNote", () => {
    it("should create zero-valued note", () => {
      const dummy = createDummyNote();
      expect(dummy.owner).toBe(0n);
      expect(dummy.amount).toBe(0n);
      expect(dummy.blinding).toBe(0n);
    });
  });

  describe("computeNoteCommitment", () => {
    it("should be deterministic for same note", async () => {
      const note: NoteV2 = { owner: 1n, amount: 100n, asset: 42n, chainId: 84532, blinding: 999n };
      const a = await computeNoteCommitment(note);
      const b = await computeNoteCommitment(note);
      expect(a).toBe(b);
    });

    it("should differ for different amounts", async () => {
      const note1: NoteV2 = { owner: 1n, amount: 100n, asset: 42n, chainId: 84532, blinding: 999n };
      const note2: NoteV2 = { owner: 1n, amount: 200n, asset: 42n, chainId: 84532, blinding: 999n };
      const a = await computeNoteCommitment(note1);
      const b = await computeNoteCommitment(note2);
      expect(a).not.toBe(b);
    });
  });

  describe("computeAssetId", () => {
    it("should produce consistent asset ID for same chain+token", async () => {
      const a = await computeAssetId(84532, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
      const b = await computeAssetId(84532, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
      expect(a).toBe(b);
    });

    it("should differ across chains", async () => {
      const a = await computeAssetId(84532, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
      const b = await computeAssetId(11155111, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
      expect(a).not.toBe(b);
    });
  });

  describe("computeNullifier", () => {
    it("should be deterministic", async () => {
      const a = await computeNullifier(42n, 100n, 5);
      const b = await computeNullifier(42n, 100n, 5);
      expect(a).toBe(b);
    });

    it("should differ for different leaf indices", async () => {
      const a = await computeNullifier(42n, 100n, 5);
      const b = await computeNullifier(42n, 100n, 6);
      expect(a).not.toBe(b);
    });
  });
});
