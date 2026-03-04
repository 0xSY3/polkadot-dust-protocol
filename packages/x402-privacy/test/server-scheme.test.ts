import { describe, it, expect } from "vitest";
import { ShieldedEvmServerScheme } from "../src/server/scheme";

describe("ShieldedEvmServerScheme", () => {
  it("should have scheme 'shielded'", () => {
    const scheme = new ShieldedEvmServerScheme();
    expect(scheme.scheme).toBe("shielded");
  });

  it("should parse dollar amounts to USDC base units", async () => {
    const scheme = new ShieldedEvmServerScheme();
    const result = await scheme.parsePrice("$0.10", "eip155:84532");
    expect(result.amount).toBe("100000");
    expect(result.asset).toBe("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
  });

  it("should parse numeric amounts", async () => {
    const scheme = new ShieldedEvmServerScheme();
    const result = await scheme.parsePrice(1.50, "eip155:84532");
    expect(result.amount).toBe("1500000");
  });

  it("should passthrough AssetAmount objects", async () => {
    const scheme = new ShieldedEvmServerScheme();
    const result = await scheme.parsePrice(
      { amount: "500000", asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
      "eip155:84532"
    );
    expect(result.amount).toBe("500000");
  });

  it("should throw for unsupported network", async () => {
    const scheme = new ShieldedEvmServerScheme();
    await expect(scheme.parsePrice("$1.00", "eip155:99999")).rejects.toThrow("unsupported");
  });
});
