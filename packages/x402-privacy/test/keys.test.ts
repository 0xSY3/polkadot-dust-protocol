import { describe, it, expect } from "vitest";
import { deriveV2Keys } from "../src/crypto/keys";

const BN254 =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const TEST_SIG =
  "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";
const TEST_PIN = "123456";

describe("deriveV2Keys", () => {
  it("should derive deterministic keys from signature + pin", async () => {
    const keys1 = await deriveV2Keys(TEST_SIG, TEST_PIN);
    const keys2 = await deriveV2Keys(TEST_SIG, TEST_PIN);

    expect(keys1.spendingKey).toBe(keys2.spendingKey);
    expect(keys1.nullifierKey).toBe(keys2.nullifierKey);
  });

  it("should produce keys within BN254 field", async () => {
    const keys = await deriveV2Keys(TEST_SIG, TEST_PIN);

    expect(keys.spendingKey).toBeGreaterThan(0n);
    expect(keys.spendingKey).toBeLessThan(BN254);
    expect(keys.nullifierKey).toBeGreaterThan(0n);
    expect(keys.nullifierKey).toBeLessThan(BN254);
  });

  it("should produce different keys for spending vs nullifier", async () => {
    const keys = await deriveV2Keys(TEST_SIG, TEST_PIN);
    expect(keys.spendingKey).not.toBe(keys.nullifierKey);
  });

  it("should produce different keys for different PINs", async () => {
    const keys1 = await deriveV2Keys(TEST_SIG, "123456");
    const keys2 = await deriveV2Keys(TEST_SIG, "654321");

    expect(keys1.spendingKey).not.toBe(keys2.spendingKey);
    expect(keys1.nullifierKey).not.toBe(keys2.nullifierKey);
  });

  it("should produce different keys for different signatures", async () => {
    const sig2 =
      "0x1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111";
    const keys1 = await deriveV2Keys(TEST_SIG, TEST_PIN);
    const keys2 = await deriveV2Keys(sig2, TEST_PIN);

    expect(keys1.spendingKey).not.toBe(keys2.spendingKey);
  });
});
