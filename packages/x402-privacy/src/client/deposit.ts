import { computeNoteCommitment, computeAssetId, computeOwnerPubKey } from "../crypto/poseidon";
import { generateBlinding } from "../crypto/note";
import { DUST_POOL_V2_ABI } from "../constants";
import type { NoteV2, NoteCommitmentV2, V2Keys } from "../crypto/types";

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export interface DepositWalletClient {
  writeContract(args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
    value?: bigint;
  }): Promise<`0x${string}`>;
}

export interface DepositPublicClient {
  waitForTransactionReceipt(args: {
    hash: `0x${string}`;
  }): Promise<{ status: "success" | "reverted" }>;
}

export interface DepositResult {
  note: NoteCommitmentV2;
  txHash: `0x${string}`;
  commitmentHex: `0x${string}`;
}

export async function createDepositCommitment(
  keys: V2Keys,
  amount: bigint,
  chainId: number,
  tokenAddress: string,
): Promise<{ note: NoteV2; commitment: bigint; commitmentHex: `0x${string}` }> {
  const owner = await computeOwnerPubKey(keys.spendingKey);
  const asset = await computeAssetId(chainId, tokenAddress);
  const blinding = generateBlinding();

  const note: NoteV2 = { owner, amount, asset, chainId, blinding };
  const commitment = await computeNoteCommitment(note);
  const commitmentHex = ("0x" + commitment.toString(16).padStart(64, "0")) as `0x${string}`;

  return { note, commitment, commitmentHex };
}

export async function depositETH(
  walletClient: DepositWalletClient,
  publicClient: DepositPublicClient,
  poolAddress: `0x${string}`,
  keys: V2Keys,
  amount: bigint,
  chainId: number,
): Promise<DepositResult> {
  const { note, commitment, commitmentHex } = await createDepositCommitment(
    keys,
    amount,
    chainId,
    "0x0000000000000000000000000000000000000000",
  );

  const txHash = await walletClient.writeContract({
    address: poolAddress,
    abi: DUST_POOL_V2_ABI,
    functionName: "deposit",
    args: [commitmentHex],
    value: amount,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Deposit transaction reverted");
  }

  const noteCommitment: NoteCommitmentV2 = {
    note,
    commitment,
    leafIndex: -1,
    spent: false,
  };

  return { note: noteCommitment, txHash, commitmentHex };
}

export async function depositERC20(
  walletClient: DepositWalletClient,
  publicClient: DepositPublicClient,
  poolAddress: `0x${string}`,
  keys: V2Keys,
  tokenAddress: `0x${string}`,
  amount: bigint,
  chainId: number,
): Promise<DepositResult> {
  const { note, commitment, commitmentHex } = await createDepositCommitment(
    keys,
    amount,
    chainId,
    tokenAddress,
  );

  const approveTx = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [poolAddress, amount],
  });
  const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
  if (approveReceipt.status !== "success") {
    throw new Error("ERC20 approve transaction reverted");
  }

  const txHash = await walletClient.writeContract({
    address: poolAddress,
    abi: DUST_POOL_V2_ABI,
    functionName: "depositERC20",
    args: [commitmentHex, tokenAddress, amount],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Deposit ERC20 transaction reverted");
  }

  const noteCommitment: NoteCommitmentV2 = {
    note,
    commitment,
    leafIndex: -1,
    spent: false,
  };

  return { note: noteCommitment, txHash, commitmentHex };
}
