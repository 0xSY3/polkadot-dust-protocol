import type { NoteCommitmentV2, NoteV2 } from "../crypto/types";

interface SerializedNote {
  owner: string;
  amount: string;
  asset: string;
  chainId: number;
  blinding: string;
}

interface SerializedNoteCommitment {
  note: SerializedNote;
  commitment: string;
  leafIndex: number;
  spent: boolean;
}

export class UtxoStore {
  private notes: Map<string, NoteCommitmentV2> = new Map();

  add(note: NoteCommitmentV2): void {
    this.notes.set(note.commitment.toString(), note);
  }

  addMany(notes: NoteCommitmentV2[]): void {
    for (const n of notes) this.add(n);
  }

  markSpent(commitment: bigint): void {
    const key = commitment.toString();
    const note = this.notes.get(key);
    if (note) {
      note.spent = true;
    }
  }

  getUnspent(asset: bigint): NoteCommitmentV2[] {
    return [...this.notes.values()].filter(
      (n) => !n.spent && n.note.asset === asset,
    );
  }

  getBalance(asset: bigint): bigint {
    return this.getUnspent(asset).reduce((sum, n) => sum + n.note.amount, 0n);
  }

  /** Greedy descending selection — picks largest notes first, max 2 (circuit limit). */
  selectForAmount(asset: bigint, targetAmount: bigint): NoteCommitmentV2[] | null {
    const unspent = this.getUnspent(asset)
      .sort((a, b) => (b.note.amount > a.note.amount ? 1 : -1));

    // Try single UTXO first
    for (const note of unspent) {
      if (note.note.amount >= targetAmount) return [note];
    }

    // Try combining two UTXOs (2-in-2-out circuit limit)
    for (let i = 0; i < unspent.length; i++) {
      for (let j = i + 1; j < unspent.length; j++) {
        if (unspent[i].note.amount + unspent[j].note.amount >= targetAmount) {
          return [unspent[i], unspent[j]];
        }
      }
    }

    return null;
  }

  get size(): number {
    return this.notes.size;
  }

  clear(): void {
    this.notes.clear();
  }

  /** Serialize all notes to JSON-safe format for persistence. */
  export(): string {
    const entries: SerializedNoteCommitment[] = [...this.notes.values()].map((nc) => ({
      note: {
        owner: nc.note.owner.toString(),
        amount: nc.note.amount.toString(),
        asset: nc.note.asset.toString(),
        chainId: nc.note.chainId,
        blinding: nc.note.blinding.toString(),
      },
      commitment: nc.commitment.toString(),
      leafIndex: nc.leafIndex,
      spent: nc.spent,
    }));
    return JSON.stringify(entries);
  }

  /** Restore notes from a JSON string produced by export(). */
  import(json: string): void {
    const entries = JSON.parse(json) as SerializedNoteCommitment[];
    for (const entry of entries) {
      const note: NoteV2 = {
        owner: BigInt(entry.note.owner),
        amount: BigInt(entry.note.amount),
        asset: BigInt(entry.note.asset),
        chainId: entry.note.chainId,
        blinding: BigInt(entry.note.blinding),
      };
      this.add({
        note,
        commitment: BigInt(entry.commitment),
        leafIndex: entry.leafIndex,
        spent: entry.spent,
      });
    }
  }
}
