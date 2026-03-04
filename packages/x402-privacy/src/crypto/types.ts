export interface NoteV2 {
  owner: bigint;
  amount: bigint;
  asset: bigint;
  chainId: number;
  blinding: bigint;
}

export interface NoteCommitmentV2 {
  note: NoteV2;
  commitment: bigint;
  leafIndex: number;
  spent: boolean;
}

export interface V2Keys {
  spendingKey: bigint;
  nullifierKey: bigint;
}

export interface MerkleProof {
  pathElements: bigint[];
  pathIndices: number[];
  root: bigint;
}
