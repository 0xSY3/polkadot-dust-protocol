import type { Network } from "@x402/core/types";
import type { ShieldedPayload } from "../types";

export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction: string;
  network: Network;
  extensions?: Record<string, unknown>;
}

interface RelayerWithdrawRequest {
  proof: string;
  publicSignals: string[];
  tokenAddress: string;
  targetChainId: number;
}

interface RelayerSuccessResponse {
  success: true;
  txHash: string;
}

interface RelayerErrorResponse {
  success?: false;
  error: string;
}

type RelayerResponse = RelayerSuccessResponse | RelayerErrorResponse;

function isRelayerSuccess(res: RelayerResponse): res is RelayerSuccessResponse {
  return "txHash" in res && res.success === true;
}

/**
 * Settle a shielded payment by POSTing to the relayer's withdraw endpoint.
 *
 * DustPoolV2.withdraw() has onlyRelayer — direct calls revert.
 * The relayer handles tree sync, nullifier locking, compliance, and gas.
 */
export async function settleShielded(
  payload: { payload: Record<string, unknown> },
  requirements: { network: Network; payTo: string; asset: string },
  relayerUrl: string,
  chainId: number,
): Promise<SettleResponse> {
  const shielded = payload.payload as unknown as ShieldedPayload;
  const { proof, publicSignals } = shielded;

  const signalsArray = [
    publicSignals.merkleRoot,
    publicSignals.nullifier0,
    publicSignals.nullifier1,
    publicSignals.outputCommitment0,
    publicSignals.outputCommitment1,
    publicSignals.publicAmount,
    publicSignals.publicAsset,
    publicSignals.recipient,
    publicSignals.chainId,
  ];

  const body: RelayerWithdrawRequest = {
    proof,
    publicSignals: signalsArray,
    tokenAddress: requirements.asset,
    targetChainId: chainId,
  };

  try {
    const res = await fetch(relayerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as RelayerResponse;

    if (!res.ok || !isRelayerSuccess(json)) {
      const errorMsg = isRelayerSuccess(json)
        ? "Unknown relayer error"
        : (json as RelayerErrorResponse).error;
      return {
        success: false,
        errorReason: "relayer_rejected",
        errorMessage: errorMsg,
        transaction: "",
        network: requirements.network,
      };
    }

    return {
      success: true,
      transaction: json.txHash,
      network: requirements.network,
    };
  } catch (err) {
    return {
      success: false,
      errorReason: "settle_failed",
      errorMessage: (err as Error).message,
      transaction: "",
      network: requirements.network,
    };
  }
}
