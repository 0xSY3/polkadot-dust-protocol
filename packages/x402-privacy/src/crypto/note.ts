import type { NoteV2 } from "./types";
import { BN254_FIELD_SIZE } from "../constants";

export function generateBlinding(): bigint {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) + BigInt(byte);
  }
  return value % BN254_FIELD_SIZE;
}

export function createNote(
  owner: bigint,
  amount: bigint,
  asset: bigint,
  chainId: number,
): NoteV2 {
  return { owner, amount, asset, chainId, blinding: generateBlinding() };
}

export function createDummyNote(): NoteV2 {
  return { owner: 0n, amount: 0n, asset: 0n, chainId: 0, blinding: 0n };
}
