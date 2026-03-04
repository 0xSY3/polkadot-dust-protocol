import type {
  SchemeNetworkClient,
  PaymentRequirements,
  PaymentPayloadResult,
  PaymentPayloadContext,
} from "@x402/core/types";
import { SCHEME_NAME } from "../constants";
import { UtxoStore } from "./utxo-store";
import { TreeClient } from "../tree/client";
import { buildPaymentInputs, formatCircuitInputs } from "./proof-inputs";
import { computeAssetId } from "../crypto/poseidon";
import type { V2Keys, NoteCommitmentV2 } from "../crypto/types";
import type { ShieldedPayload, ShieldedExtra } from "../types";

export interface ShieldedClientOptions {
  spendingKey: bigint;
  nullifierKey: bigint;
  treeServiceUrl: string;
  wasmPath?: string;
  zkeyPath?: string;
}

export class ShieldedEvmClientScheme implements SchemeNetworkClient {
  readonly scheme = SCHEME_NAME;
  private readonly keys: V2Keys;
  private readonly store = new UtxoStore();
  private treeClient: TreeClient;
  private wasmPath: string;
  private zkeyPath: string;

  constructor(options: ShieldedClientOptions) {
    this.keys = {
      spendingKey: options.spendingKey,
      nullifierKey: options.nullifierKey,
    };
    this.treeClient = new TreeClient(options.treeServiceUrl);
    this.wasmPath = options.wasmPath ?? "";
    this.zkeyPath = options.zkeyPath ?? "";
  }

  loadUtxos(notes: NoteCommitmentV2[]): void {
    this.store.addMany(notes);
  }

  getBalance(asset: bigint): bigint {
    return this.store.getBalance(asset);
  }

  getStore(): UtxoStore {
    return this.store;
  }

  async createPaymentPayload(
    x402Version: number,
    paymentRequirements: PaymentRequirements,
    _context?: PaymentPayloadContext,
  ): Promise<PaymentPayloadResult> {
    const extra = paymentRequirements.extra as ShieldedExtra | undefined;
    const chainId = parseInt(paymentRequirements.network.split(":")[1], 10);
    const assetId = await computeAssetId(chainId, paymentRequirements.asset);
    const amount = BigInt(paymentRequirements.amount);

    const selected = this.store.selectForAmount(assetId, amount);
    if (!selected || selected.length === 0) {
      throw new Error(
        `Insufficient shielded balance. Need ${amount}, have ${this.store.getBalance(assetId)}`,
      );
    }

    const inputNote = selected[0];

    const treeUrl = extra?.treeServiceUrl ?? this.treeClient["baseUrl"];
    const treeClient = new TreeClient(treeUrl);
    const merkleProof = await treeClient.getProof(inputNote.leafIndex);

    const proofInputs = await buildPaymentInputs({
      inputNote,
      paymentAmount: amount,
      recipient: paymentRequirements.payTo,
      keys: this.keys,
      merkleProof,
      chainId,
    });

    const { fflonk } = await import("snarkjs");
    const circuitInputs = formatCircuitInputs(proofInputs);

    const { proof, publicSignals } = await fflonk.fullProve(
      circuitInputs,
      this.wasmPath,
      this.zkeyPath,
    );

    if (publicSignals.length !== 9) {
      throw new Error(`Expected 9 public signals, got ${publicSignals.length}`);
    }

    const calldata = await fflonk.exportSolidityCallData(publicSignals, proof);
    const proofHex = parseCalldataProofHex(calldata);

    this.store.markSpent(inputNote.commitment);

    const payload: ShieldedPayload = {
      proof: proofHex as `0x${string}`,
      publicSignals: {
        merkleRoot: publicSignals[0],
        nullifier0: publicSignals[1],
        nullifier1: publicSignals[2],
        outputCommitment0: publicSignals[3],
        outputCommitment1: publicSignals[4],
        publicAmount: publicSignals[5],
        publicAsset: publicSignals[6],
        recipient: publicSignals[7],
        chainId: publicSignals[8],
      },
    };

    return {
      x402Version,
      payload: payload as unknown as Record<string, unknown>,
    };
  }
}

function parseCalldataProofHex(calldata: string): string {
  const hexElements = calldata.match(/0x[0-9a-fA-F]+/g);
  if (!hexElements || hexElements.length < 24) {
    throw new Error(
      `Failed to parse FFLONK calldata — expected ≥24 hex elements, got ${hexElements?.length ?? 0}`,
    );
  }
  return "0x" + hexElements.slice(0, 24).map((e) => e.slice(2)).join("");
}
