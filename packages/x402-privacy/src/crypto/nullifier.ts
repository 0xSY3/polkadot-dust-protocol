import { poseidonHash } from "./poseidon";

export async function computeNullifier(
  nullifierKey: bigint,
  commitment: bigint,
  leafIndex: number,
): Promise<bigint> {
  return poseidonHash([nullifierKey, commitment, BigInt(leafIndex)]);
}
