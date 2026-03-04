import type {
  SchemeNetworkFacilitator,
  PaymentPayload,
  PaymentRequirements,
  FacilitatorContext,
  Network,
} from "@x402/core/types";
import type { VerifyResponse } from "./verify";
import type { SettleResponse } from "./settle";
import { SCHEME_NAME, TREE_DEPTH } from "../constants";
import type { FacilitatorEvmSigner } from "./types";
import type { ShieldedExtra } from "../types";
import { verifyShielded } from "./verify";
import { settleShielded } from "./settle";

export interface ShieldedFacilitatorOptions {
  poolAddresses: Record<string, `0x${string}`>;
  treeServiceUrl?: string;
  supportedAssets?: Record<string, `0x${string}`[]>;
  relayerUrl?: string;
}

export class ShieldedEvmFacilitatorScheme implements SchemeNetworkFacilitator {
  readonly scheme = SCHEME_NAME;
  readonly caipFamily = "eip155:*";

  constructor(
    private readonly signer: FacilitatorEvmSigner,
    private readonly options: ShieldedFacilitatorOptions,
  ) {}

  getExtra(network: Network): Record<string, unknown> | undefined {
    const poolAddress = this.options.poolAddresses[network];
    if (!poolAddress) return undefined;

    const extra: ShieldedExtra = {
      dustPoolV2: poolAddress,
      merkleRoot: "0",
      treeDepth: TREE_DEPTH,
      treeServiceUrl: this.options.treeServiceUrl ?? "",
      supportedAssets: this.options.supportedAssets?.[network] ?? [],
    };

    return extra as unknown as Record<string, unknown>;
  }

  getSigners(_network: string): string[] {
    return [...this.signer.getAddresses()];
  }

  async verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
    _context?: FacilitatorContext,
  ): Promise<VerifyResponse> {
    const poolAddress = this.options.poolAddresses[requirements.network];
    if (!poolAddress) {
      return { isValid: false, invalidReason: "unsupported_network" };
    }
    return verifyShielded(this.signer, payload, requirements, poolAddress);
  }

  async settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
    _context?: FacilitatorContext,
  ): Promise<SettleResponse> {
    const chainIdStr = requirements.network.split(":")[1];
    if (!chainIdStr) {
      return {
        success: false,
        errorReason: "unsupported_network",
        transaction: "",
        network: requirements.network,
      };
    }
    const chainId = Number(chainIdStr);
    if (isNaN(chainId)) {
      return {
        success: false,
        errorReason: "unsupported_network",
        transaction: "",
        network: requirements.network,
      };
    }
    const relayerUrl = this.options.relayerUrl ?? "/api/v2/withdraw";
    return settleShielded(payload, requirements, relayerUrl, chainId);
  }
}
