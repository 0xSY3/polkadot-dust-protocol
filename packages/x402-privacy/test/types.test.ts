import { describe, it, expect } from "vitest";
import type { ShieldedPayload, ShieldedExtra } from "../src/types";
import { isShieldedPayload } from "../src/types";

describe("Shielded Types", () => {
  it("should accept valid ShieldedPayload", () => {
    const payload: ShieldedPayload = {
      proof: "0x" + "ab".repeat(384) as `0x${string}`,
      publicSignals: {
        merkleRoot: "12345",
        nullifier0: "67890",
        nullifier1: "0",
        outputCommitment0: "11111",
        outputCommitment1: "22222",
        publicAmount: "1000000",
        publicAsset: "33333",
        recipient: "44444",
        chainId: "84532",
      },
    };
    expect(payload.proof).toMatch(/^0x[0-9a-f]+$/i);
    expect(Object.keys(payload.publicSignals)).toHaveLength(9);
  });

  it("should detect shielded payload via type guard", () => {
    const shielded = { proof: "0xabc", publicSignals: { merkleRoot: "1" } };
    const exact = { authorization: { from: "0x123" } };
    expect(isShieldedPayload(shielded)).toBe(true);
    expect(isShieldedPayload(exact)).toBe(false);
  });
});
