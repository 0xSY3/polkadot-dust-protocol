export type ShieldedPayload = {
  proof: `0x${string}`;
  publicSignals: {
    merkleRoot: string;
    nullifier0: string;
    nullifier1: string;
    outputCommitment0: string;
    outputCommitment1: string;
    publicAmount: string;
    publicAsset: string;
    recipient: string;
    chainId: string;
  };
  encryptedNotes?: string[];
};

export type ShieldedExtra = {
  dustPoolV2: `0x${string}`;
  merkleRoot: string;
  treeDepth: number;
  treeServiceUrl: string;
  supportedAssets: `0x${string}`[];
};

export function isShieldedPayload(
  payload: Record<string, unknown>
): payload is ShieldedPayload {
  return "proof" in payload && "publicSignals" in payload;
}
