import { poseidonHash } from "./poseidon";
import type { MerkleProof } from "./types";

const ROOT_HISTORY_SIZE = 100;

export class MerkleTree {
  private levels: number;
  private filledSubtrees: bigint[];
  private zeros: bigint[];
  private leaves: bigint[] = [];
  private rootHistory: bigint[] = [];
  private currentRootIndex = 0;

  private constructor(levels: number, zeros: bigint[], filledSubtrees: bigint[], initialRoot: bigint) {
    this.levels = levels;
    this.zeros = zeros;
    this.filledSubtrees = filledSubtrees;
    this.rootHistory.push(initialRoot);
  }

  static async create(depth: number): Promise<MerkleTree> {
    const zeros: bigint[] = [0n];
    for (let i = 1; i <= depth; i++) {
      zeros.push(await poseidonHash([zeros[i - 1], zeros[i - 1]]));
    }
    const filledSubtrees = zeros.slice(0, depth);
    const initialRoot = zeros[depth];
    return new MerkleTree(depth, zeros, [...filledSubtrees], initialRoot);
  }

  get root(): bigint {
    return this.rootHistory[this.currentRootIndex];
  }

  get leafCount(): number {
    return this.leaves.length;
  }

  getLeaf(index: number): bigint | undefined {
    return this.leaves[index];
  }

  async insert(leaf: bigint): Promise<number> {
    const index = this.leaves.length;
    this.leaves.push(leaf);

    let currentHash = leaf;
    let currentIndex = index;

    for (let i = 0; i < this.levels; i++) {
      if (currentIndex % 2 === 0) {
        this.filledSubtrees[i] = currentHash;
        currentHash = await poseidonHash([currentHash, this.zeros[i]]);
      } else {
        currentHash = await poseidonHash([this.filledSubtrees[i], currentHash]);
      }
      currentIndex = Math.floor(currentIndex / 2);
    }

    this.currentRootIndex = (this.currentRootIndex + 1) % ROOT_HISTORY_SIZE;
    if (this.rootHistory.length <= this.currentRootIndex) {
      this.rootHistory.push(currentHash);
    } else {
      this.rootHistory[this.currentRootIndex] = currentHash;
    }

    return index;
  }

  async insertMany(newLeaves: bigint[]): Promise<void> {
    for (const leaf of newLeaves) {
      await this.insert(leaf);
    }
  }

  async getProof(leafIndex: number): Promise<MerkleProof> {
    if (leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of bounds (${this.leaves.length} leaves)`);
    }

    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];
    let currentIndex = leafIndex;

    let currentLevel = [...this.leaves];
    const levelSize = 1 << this.levels;
    while (currentLevel.length < levelSize) {
      currentLevel.push(this.zeros[0]);
    }

    for (let i = 0; i < this.levels; i++) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      pathElements.push(currentLevel[siblingIndex] ?? this.zeros[i]);
      pathIndices.push(currentIndex % 2);

      const nextLevel: bigint[] = [];
      for (let j = 0; j < currentLevel.length; j += 2) {
        const left = currentLevel[j];
        const right = currentLevel[j + 1] ?? this.zeros[i];
        nextLevel.push(await poseidonHash([left, right]));
      }
      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices, root: this.root };
  }
}
