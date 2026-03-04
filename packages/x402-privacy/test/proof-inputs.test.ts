import { describe, it, expect } from "vitest";
import { buildPaymentInputs } from "../src/client/proof-inputs";
import { computeNoteCommitment, computeAssetId, computeOwnerPubKey } from "../src/crypto";
import type { NoteCommitmentV2, V2Keys, MerkleProof } from "../src/crypto";
import { BN254_FIELD_SIZE, TREE_DEPTH } from "../src/constants";

describe("buildPaymentInputs", () => {
  it("should build valid withdraw inputs for a payment", async () => {
    // #given
    const keys: V2Keys = { spendingKey: 42n, nullifierKey: 99n };
    const owner = await computeOwnerPubKey(keys.spendingKey);
    const asset = await computeAssetId(84532, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const note = { owner, amount: 1000000n, asset, chainId: 84532, blinding: 12345n };
    const commitment = await computeNoteCommitment(note);

    const inputNote: NoteCommitmentV2 = {
      note,
      commitment,
      leafIndex: 0,
      spent: false,
    };

    const merkleProof: MerkleProof = {
      pathElements: new Array(TREE_DEPTH).fill(0n),
      pathIndices: new Array(TREE_DEPTH).fill(0),
      root: 0n,
    };

    const paymentAmount = 100000n;
    const recipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

    // #when
    const inputs = await buildPaymentInputs({
      inputNote,
      paymentAmount,
      recipient,
      keys,
      merkleProof,
      chainId: 84532,
    });

    // #then
    expect(inputs.publicAmount).toBe(BN254_FIELD_SIZE - paymentAmount);
    expect(inputs.recipient).toBe(BigInt(recipient));
    expect(inputs.chainId).toBe(84532n);
    expect(inputs.inOwner).toHaveLength(2);
    expect(inputs.outOwner).toHaveLength(2);
    expect(inputs.pathElements).toHaveLength(2);
    expect(inputs.pathElements[0]).toHaveLength(TREE_DEPTH);
  });

  it("should handle exact-amount payment (no change)", async () => {
    // #given
    const keys: V2Keys = { spendingKey: 42n, nullifierKey: 99n };
    const owner = await computeOwnerPubKey(keys.spendingKey);
    const asset = await computeAssetId(84532, "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const note = { owner, amount: 100000n, asset, chainId: 84532, blinding: 12345n };
    const commitment = await computeNoteCommitment(note);

    // #when
    const inputs = await buildPaymentInputs({
      inputNote: { note, commitment, leafIndex: 0, spent: false },
      paymentAmount: 100000n,
      recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      keys,
      merkleProof: { pathElements: new Array(TREE_DEPTH).fill(0n), pathIndices: new Array(TREE_DEPTH).fill(0), root: 0n },
      chainId: 84532,
    });

    // #then — change output should be zero-valued
    expect(inputs.outAmount[1]).toBe(0n);
  });

  it("should reject payment exceeding note balance", async () => {
    // #given
    const keys: V2Keys = { spendingKey: 42n, nullifierKey: 99n };
    const note = { owner: 1n, amount: 100n, asset: 1n, chainId: 84532, blinding: 1n };
    const commitment = await computeNoteCommitment(note);

    // #when + #then
    await expect(
      buildPaymentInputs({
        inputNote: { note, commitment, leafIndex: 0, spent: false },
        paymentAmount: 200n,
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        keys,
        merkleProof: { pathElements: new Array(TREE_DEPTH).fill(0n), pathIndices: new Array(TREE_DEPTH).fill(0), root: 0n },
        chainId: 84532,
      })
    ).rejects.toThrow("exceeds");
  });
});
