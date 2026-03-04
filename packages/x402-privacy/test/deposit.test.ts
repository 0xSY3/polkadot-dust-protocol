import { describe, it, expect, vi } from "vitest";
import { createDepositCommitment, depositETH, depositERC20 } from "../src/client/deposit";
import type { DepositWalletClient, DepositPublicClient } from "../src/client/deposit";
import type { V2Keys } from "../src/crypto/types";

const KEYS: V2Keys = { spendingKey: 42n, nullifierKey: 99n };
const POOL = "0x17f52f01ffcB6d3C376b2b789314808981cebb16" as const;
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`;

describe("deposit helpers", () => {
  it("should create a valid deposit commitment", async () => {
    const result = await createDepositCommitment(KEYS, 1_000_000n, 84532, USDC);

    expect(result.note.amount).toBe(1_000_000n);
    expect(result.note.chainId).toBe(84532);
    expect(result.note.blinding).toBeGreaterThan(0n);
    expect(result.commitment).toBeGreaterThan(0n);
    expect(result.commitmentHex).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("should produce different commitments for different amounts", async () => {
    const r1 = await createDepositCommitment(KEYS, 1_000_000n, 84532, USDC);
    const r2 = await createDepositCommitment(KEYS, 2_000_000n, 84532, USDC);

    expect(r1.commitment).not.toBe(r2.commitment);
  });

  it("should deposit ETH via walletClient", async () => {
    const mockWallet: DepositWalletClient = {
      writeContract: vi.fn().mockResolvedValue("0xabc123" as `0x${string}`),
    };
    const mockPublic: DepositPublicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    };

    const result = await depositETH(mockWallet, mockPublic, POOL, KEYS, 1_000_000n, 84532);

    expect(result.txHash).toBe("0xabc123");
    expect(result.note.note.amount).toBe(1_000_000n);
    expect(result.note.leafIndex).toBe(-1);
    expect(mockWallet.writeContract).toHaveBeenCalledOnce();
  });

  it("should deposit ERC20 (approve + deposit)", async () => {
    const calls: string[] = [];
    const mockWallet: DepositWalletClient = {
      writeContract: vi.fn().mockImplementation((args: { functionName: string }) => {
        calls.push(args.functionName);
        return Promise.resolve("0xdef456" as `0x${string}`);
      }),
    };
    const mockPublic: DepositPublicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    };

    const result = await depositERC20(mockWallet, mockPublic, POOL, KEYS, USDC, 1_000_000n, 84532);

    expect(calls).toEqual(["approve", "depositERC20"]);
    expect(result.txHash).toBe("0xdef456");
    expect(mockWallet.writeContract).toHaveBeenCalledTimes(2);
  });

  it("should throw on failed approve", async () => {
    const mockWallet: DepositWalletClient = {
      writeContract: vi.fn().mockResolvedValue("0x111" as `0x${string}`),
    };
    const mockPublic: DepositPublicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "reverted" }),
    };

    await expect(
      depositERC20(mockWallet, mockPublic, POOL, KEYS, USDC, 1_000_000n, 84532),
    ).rejects.toThrow("ERC20 approve transaction reverted");
  });
});
