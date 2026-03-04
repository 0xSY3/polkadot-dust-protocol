import type { NoteCommitmentV2, V2Keys, MerkleProof } from "../crypto/types";
import { computeNoteCommitment, poseidonHash } from "../crypto/poseidon";
import { computeNullifier } from "../crypto/nullifier";
import { createNote, createDummyNote } from "../crypto/note";
import { BN254_FIELD_SIZE, TREE_DEPTH } from "../constants";

export interface PaymentInputParams {
  inputNote: NoteCommitmentV2;
  paymentAmount: bigint;
  recipient: string;
  keys: V2Keys;
  merkleProof: MerkleProof;
  chainId: number;
}

export interface ProofInputs {
  merkleRoot: bigint;
  nullifier0: bigint;
  nullifier1: bigint;
  outputCommitment0: bigint;
  outputCommitment1: bigint;
  publicAmount: bigint;
  publicAsset: bigint;
  recipient: bigint;
  chainId: bigint;

  spendingKey: bigint;
  nullifierKey: bigint;
  inOwner: [bigint, bigint];
  inAmount: [bigint, bigint];
  inAsset: [bigint, bigint];
  inChainId: [bigint, bigint];
  inBlinding: [bigint, bigint];
  pathElements: [bigint[], bigint[]];
  pathIndices: [number[], number[]];
  leafIndex: [bigint, bigint];
  outOwner: [bigint, bigint];
  outAmount: [bigint, bigint];
  outAsset: [bigint, bigint];
  outChainId: [bigint, bigint];
  outBlinding: [bigint, bigint];
}

export async function buildPaymentInputs(params: PaymentInputParams): Promise<ProofInputs> {
  const { inputNote, paymentAmount, recipient, keys, merkleProof, chainId } = params;

  if (paymentAmount > inputNote.note.amount) {
    throw new Error(
      `Payment amount (${paymentAmount}) exceeds note balance (${inputNote.note.amount})`
    );
  }

  const dummy = createDummyNote();
  const dummyProof = {
    pathElements: new Array<bigint>(TREE_DEPTH).fill(0n),
    pathIndices: new Array<number>(TREE_DEPTH).fill(0),
  };

  const changeAmount = inputNote.note.amount - paymentAmount;
  const changeNote = changeAmount > 0n
    ? createNote(inputNote.note.owner, changeAmount, inputNote.note.asset, inputNote.note.chainId)
    : createDummyNote();

  const nullifier0 = await computeNullifier(keys.nullifierKey, inputNote.commitment, inputNote.leafIndex);
  const nullifier1 = 0n;

  const outputCommitment0 = await computeNoteCommitment(changeNote);
  const dummyOutputCommitment = await computeNoteCommitment(dummy);

  // Withdrawal = negative amount in BN254 field arithmetic
  const negativeAmount = BN254_FIELD_SIZE - paymentAmount;

  // Recompute Merkle root from proof path
  let currentHash = inputNote.commitment;
  for (let i = 0; i < TREE_DEPTH; i++) {
    if (merkleProof.pathIndices[i] === 0) {
      currentHash = await poseidonHash([currentHash, merkleProof.pathElements[i]]);
    } else {
      currentHash = await poseidonHash([merkleProof.pathElements[i], currentHash]);
    }
  }

  return {
    merkleRoot: currentHash,
    nullifier0,
    nullifier1,
    outputCommitment0,
    outputCommitment1: dummyOutputCommitment,
    publicAmount: negativeAmount,
    publicAsset: inputNote.note.asset,
    recipient: BigInt(recipient),
    chainId: BigInt(chainId),

    inOwner: [inputNote.note.owner, dummy.owner],
    inAmount: [inputNote.note.amount, dummy.amount],
    inAsset: [inputNote.note.asset, dummy.asset],
    inChainId: [BigInt(inputNote.note.chainId), BigInt(dummy.chainId)],
    inBlinding: [inputNote.note.blinding, dummy.blinding],
    pathElements: [merkleProof.pathElements, dummyProof.pathElements],
    pathIndices: [merkleProof.pathIndices, dummyProof.pathIndices],
    leafIndex: [BigInt(inputNote.leafIndex), 0n],

    outOwner: [changeNote.owner, dummy.owner],
    outAmount: [changeNote.amount, dummy.amount],
    outAsset: [changeNote.asset, dummy.asset],
    outChainId: [BigInt(changeNote.chainId), BigInt(dummy.chainId)],
    outBlinding: [changeNote.blinding, dummy.blinding],

    spendingKey: keys.spendingKey,
    nullifierKey: keys.nullifierKey,
  };
}

export function formatCircuitInputs(
  inputs: ProofInputs,
): Record<string, string | string[] | string[][]> {
  return {
    merkleRoot: inputs.merkleRoot.toString(),
    nullifier0: inputs.nullifier0.toString(),
    nullifier1: inputs.nullifier1.toString(),
    outputCommitment0: inputs.outputCommitment0.toString(),
    outputCommitment1: inputs.outputCommitment1.toString(),
    publicAmount: inputs.publicAmount.toString(),
    publicAsset: inputs.publicAsset.toString(),
    recipient: inputs.recipient.toString(),
    chainId: inputs.chainId.toString(),
    spendingKey: inputs.spendingKey.toString(),
    nullifierKey: inputs.nullifierKey.toString(),
    inOwner: inputs.inOwner.map(String),
    inAmount: inputs.inAmount.map(String),
    inAsset: inputs.inAsset.map(String),
    inChainId: inputs.inChainId.map(String),
    inBlinding: inputs.inBlinding.map(String),
    leafIndex: inputs.leafIndex.map(String),
    pathElements: inputs.pathElements.map((arr) => arr.map(String)),
    pathIndices: inputs.pathIndices.map((arr) => arr.map(String)),
    outOwner: inputs.outOwner.map(String),
    outAmount: inputs.outAmount.map(String),
    outAsset: inputs.outAsset.map(String),
    outChainId: inputs.outChainId.map(String),
    outBlinding: inputs.outBlinding.map(String),
  };
}
