import type { FacilitatorEvmSigner } from "./types";
import type { ShieldedPayload } from "../types";
import { DUST_POOL_V2_ABI, BN254_FIELD_SIZE, FFLONK_VERIFIER_ABI, VERIFIER_ADDRESSES } from "../constants";

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  invalidMessage?: string;
  payer?: string;
  extensions?: Record<string, unknown>;
}

export async function verifyShielded(
  signer: FacilitatorEvmSigner,
  payload: { payload: Record<string, unknown> },
  requirements: { amount: string; network: string; payTo: string },
  poolAddress: `0x${string}`,
): Promise<VerifyResponse> {
  const shielded = payload.payload as unknown as ShieldedPayload;
  const { publicSignals } = shielded;

  const toBytesHex = (v: string): `0x${string}` =>
    ("0x" + BigInt(v).toString(16).padStart(64, "0")) as `0x${string}`;

  // 0. Verify ZK proof on-chain via FFLONK verifier
  const verifierAddress = VERIFIER_ADDRESSES[requirements.network];
  if (verifierAddress) {
    const pubSignalsArray = [
      BigInt(publicSignals.merkleRoot),
      BigInt(publicSignals.nullifier0),
      BigInt(publicSignals.nullifier1),
      BigInt(publicSignals.outputCommitment0),
      BigInt(publicSignals.outputCommitment1),
      BigInt(publicSignals.publicAmount),
      BigInt(publicSignals.publicAsset),
      BigInt(publicSignals.recipient),
      BigInt(publicSignals.chainId),
    ] as const;

    // FFLONK verifiers revert (not return false) on invalid proofs
    try {
      const proofValid = (await signer.readContract({
        address: verifierAddress,
        abi: FFLONK_VERIFIER_ABI,
        functionName: "verifyProof",
        args: [shielded.proof, pubSignalsArray],
      })) as boolean;

      if (!proofValid) {
        return {
          isValid: false,
          invalidReason: "invalid_proof",
          invalidMessage: "FFLONK proof verification failed on-chain",
        };
      }
    } catch {
      return {
        isValid: false,
        invalidReason: "invalid_proof",
        invalidMessage: "FFLONK proof verification reverted on-chain",
      };
    }
  }

  // 1. Check Merkle root is known on-chain
  const isKnownRoot = (await signer.readContract({
    address: poolAddress,
    abi: DUST_POOL_V2_ABI,
    functionName: "isKnownRoot",
    args: [toBytesHex(publicSignals.merkleRoot)],
  })) as boolean;

  if (!isKnownRoot) {
    return {
      isValid: false,
      invalidReason: "unknown_merkle_root",
      invalidMessage: "Merkle root not recognized by DustPoolV2",
    };
  }

  // 2. Check nullifiers aren't spent
  const isSpent = (await signer.readContract({
    address: poolAddress,
    abi: DUST_POOL_V2_ABI,
    functionName: "nullifiers",
    args: [toBytesHex(publicSignals.nullifier0)],
  })) as boolean;

  if (isSpent) {
    return {
      isValid: false,
      invalidReason: "nullifier_already_spent",
      invalidMessage: "Nullifier has already been used",
    };
  }

  // 3. Check amount meets requirements
  // publicAmount is field-negative for withdrawals: FIELD_SIZE - amount
  const publicAmount = BigInt(publicSignals.publicAmount);
  const actualAmount =
    publicAmount > BN254_FIELD_SIZE / 2n
      ? BN254_FIELD_SIZE - publicAmount
      : publicAmount;
  const requiredAmount = BigInt(requirements.amount);

  if (actualAmount < requiredAmount) {
    return {
      isValid: false,
      invalidReason: "insufficient_amount",
      invalidMessage: `Payment amount ${actualAmount} < required ${requiredAmount}`,
    };
  }

  // 4. Check chainId matches network
  const expectedChainId = requirements.network.split(":")[1];
  if (publicSignals.chainId !== expectedChainId) {
    return {
      isValid: false,
      invalidReason: "chain_mismatch",
      invalidMessage: `ChainId ${publicSignals.chainId} != ${expectedChainId}`,
    };
  }

  // 5. Check recipient matches payTo
  const expectedRecipient = BigInt(requirements.payTo);
  if (BigInt(publicSignals.recipient) !== expectedRecipient) {
    return {
      isValid: false,
      invalidReason: "recipient_mismatch",
      invalidMessage: "Payment recipient doesn't match payTo",
    };
  }

  return { isValid: true };
}
