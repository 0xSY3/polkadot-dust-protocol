import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShieldedEvmClientScheme } from "../src/client/scheme";

vi.mock("snarkjs", () => ({
  fflonk: {
    fullProve: vi.fn().mockResolvedValue({
      proof: { mockProof: true },
      publicSignals: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    }),
    exportSolidityCallData: vi.fn().mockResolvedValue(
      "[" + Array(24).fill("0x" + "ab".repeat(32)).join(",") + "],[" + Array(9).fill("0x01").join(",") + "]"
    ),
  },
}));

describe("ShieldedEvmClientScheme", () => {
  it("should have scheme name 'shielded'", () => {
    const scheme = new ShieldedEvmClientScheme({
      spendingKey: 42n,
      nullifierKey: 99n,
      treeServiceUrl: "http://localhost:3001/tree",
    });
    expect(scheme.scheme).toBe("shielded");
  });

  it("should require UTXOs to generate payload", async () => {
    const scheme = new ShieldedEvmClientScheme({
      spendingKey: 42n,
      nullifierKey: 99n,
      treeServiceUrl: "http://localhost:3001/tree",
    });

    const requirements = {
      scheme: "shielded",
      network: "eip155:84532",
      amount: "1000000",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      payTo: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      maxTimeoutSeconds: 300,
      extra: {
        dustPoolV2: "0x17f52f01ffcB6d3C376b2b789314808981cebb16",
        merkleRoot: "12345",
        treeDepth: 20,
        treeServiceUrl: "http://localhost:3001/tree",
        supportedAssets: ["0x036CbD53842c5426634e7929541eC2318f3dCF7e"],
      },
    };

    await expect(
      scheme.createPaymentPayload(2, requirements as any)
    ).rejects.toThrow();
  });
});
