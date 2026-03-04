import { createPublicClient, http, type PublicClient, parseAbiItem } from "viem";
import { MerkleTree } from "../crypto/merkle";
import type { TreeConfig } from "./types";
import { TREE_DEPTH } from "../constants";

export class TreeIndexer {
  private tree!: MerkleTree;
  private client: PublicClient;
  private poolAddress: `0x${string}`;
  private lastBlock: bigint;
  private commitmentMap: Map<string, number> = new Map();
  private initialized = false;

  constructor(config: TreeConfig) {
    this.client = createPublicClient({ transport: http(config.rpcUrl) });
    this.poolAddress = config.poolAddress;
    this.lastBlock = config.startBlock ?? 0n;
  }

  async initialize(): Promise<void> {
    this.tree = await MerkleTree.create(TREE_DEPTH);
    await this.sync();
    this.initialized = true;
  }

  async sync(): Promise<void> {
    const currentBlock = await this.client.getBlockNumber();
    if (currentBlock <= this.lastBlock) return;

    const CHUNK_SIZE = 10_000n;
    let fromBlock = this.lastBlock + 1n;

    while (fromBlock <= currentBlock) {
      const toBlock =
        fromBlock + CHUNK_SIZE - 1n > currentBlock
          ? currentBlock
          : fromBlock + CHUNK_SIZE - 1n;

      const logs = await this.client.getLogs({
        address: this.poolAddress,
        event: parseAbiItem(
          "event DepositQueued(bytes32 indexed commitment, uint256 queueIndex, uint256 amount, address asset, uint256 timestamp)",
        ),
        fromBlock,
        toBlock,
      });

      for (const log of logs) {
        const commitment = BigInt(log.args.commitment as string);
        const leafIndex = await this.tree.insert(commitment);
        this.commitmentMap.set(commitment.toString(), leafIndex);
      }

      fromBlock = toBlock + 1n;
    }

    this.lastBlock = currentBlock;
  }

  get root(): bigint {
    return this.tree.root;
  }

  get leafCount(): number {
    return this.tree.leafCount;
  }

  async getProof(leafIndex: number) {
    return this.tree.getProof(leafIndex);
  }

  lookupCommitment(commitment: string): number | undefined {
    return this.commitmentMap.get(commitment);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
