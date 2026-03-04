import type { MerkleProofResponse, TreeRootResponse, CommitmentLookupResponse } from "./types";
import type { MerkleProof } from "../crypto/types";

export class TreeClient {
  constructor(private readonly baseUrl: string) {}

  async getRoot(): Promise<TreeRootResponse> {
    const res = await fetch(`${this.baseUrl}/root`);
    if (!res.ok) throw new Error(`Tree service error: ${res.status}`);
    return res.json();
  }

  async getProof(leafIndex: number): Promise<MerkleProof> {
    const res = await fetch(`${this.baseUrl}/path/${leafIndex}`);
    if (!res.ok) throw new Error(`Tree service error: ${res.status}`);
    const data: MerkleProofResponse = await res.json();
    return {
      pathElements: data.pathElements.map(BigInt),
      pathIndices: data.pathIndices,
      root: BigInt(data.root),
    };
  }

  async lookupCommitment(commitmentHex: string): Promise<CommitmentLookupResponse> {
    const res = await fetch(`${this.baseUrl}/commitment/${commitmentHex}`);
    if (!res.ok) throw new Error(`Tree service error: ${res.status}`);
    return res.json();
  }
}
