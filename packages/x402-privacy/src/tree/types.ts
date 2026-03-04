export interface TreeConfig {
  rpcUrl: string;
  poolAddress: `0x${string}`;
  startBlock?: bigint;
  pollIntervalMs?: number;
}

export interface MerkleProofResponse {
  root: string;
  pathElements: string[];
  pathIndices: number[];
  leafIndex: number;
}

export interface TreeRootResponse {
  root: string;
  leafCount: number;
}

export interface CommitmentLookupResponse {
  exists: boolean;
  leafIndex?: number;
}
