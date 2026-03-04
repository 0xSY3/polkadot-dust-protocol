import { buildPoseidon, type PoseidonInstance } from "circomlibjs";
import type { NoteV2 } from "./types";

let poseidonInstance: PoseidonInstance | null = null;

async function ensurePoseidon(): Promise<PoseidonInstance> {
  if (poseidonInstance) return poseidonInstance;
  poseidonInstance = await buildPoseidon();
  return poseidonInstance;
}

export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await ensurePoseidon();
  const raw = poseidon(inputs);
  return poseidon.F.toObject(raw);
}

export async function computeNoteCommitment(note: NoteV2): Promise<bigint> {
  return poseidonHash([
    note.owner,
    note.amount,
    note.asset,
    BigInt(note.chainId),
    note.blinding,
  ]);
}

export async function computeAssetId(
  chainId: number,
  tokenAddress: string,
): Promise<bigint> {
  return poseidonHash([BigInt(chainId), BigInt(tokenAddress)]);
}

export async function computeOwnerPubKey(
  spendingKey: bigint,
): Promise<bigint> {
  return poseidonHash([spendingKey]);
}
