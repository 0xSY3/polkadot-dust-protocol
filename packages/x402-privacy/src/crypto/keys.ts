import type { V2Keys } from "./types";

const BN254_FIELD_SIZE =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

async function pbkdf2Derive(password: string, salt: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(derived);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return BigInt("0x" + hex);
}

/**
 * Derive V2 spending + nullifier keys from a wallet signature and 6-digit PIN.
 *
 * PBKDF2 with 100K iterations (SHA-256), domain-separated salts.
 * Keys reduced mod BN254 field size for circuit compatibility.
 * Matches the monorepo's deriveV2Keys output (same salts, same iterations).
 */
export async function deriveV2Keys(signature: string, pin: string): Promise<V2Keys> {
  const password = signature + pin;

  const [spendingBytes, viewingBytes] = await Promise.all([
    pbkdf2Derive(password, "Dust Spend Authority v2"),
    pbkdf2Derive(password, "Dust View Authority v2"),
  ]);

  const spendingKey = bytesToBigInt(spendingBytes) % BN254_FIELD_SIZE;
  const nullifierKey = bytesToBigInt(viewingBytes) % BN254_FIELD_SIZE;

  if (spendingKey === 0n || nullifierKey === 0n) {
    throw new Error("Derived key is zero — change PIN or re-sign");
  }

  return { spendingKey, nullifierKey };
}
