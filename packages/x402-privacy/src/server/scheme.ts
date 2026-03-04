import type {
  SchemeNetworkServer,
  Price,
  AssetAmount,
  Network,
  PaymentRequirements,
} from "@x402/core/types";
import { SCHEME_NAME, DEFAULT_ASSETS } from "../constants";

export class ShieldedEvmServerScheme implements SchemeNetworkServer {
  readonly scheme = SCHEME_NAME;

  async parsePrice(price: Price, network: Network): Promise<AssetAmount> {
    if (typeof price === "object" && "amount" in price && "asset" in price) {
      return price as AssetAmount;
    }

    const asset = DEFAULT_ASSETS[network];
    if (!asset) {
      throw new Error(`unsupported network for shielded scheme: ${network}`);
    }

    let decimal: number;
    if (typeof price === "string") {
      decimal = parseFloat(price.replace(/^\$/, ""));
    } else {
      decimal = price;
    }

    if (isNaN(decimal) || decimal <= 0) {
      throw new Error(`Invalid price: ${price}`);
    }

    const amount = Math.round(decimal * 10 ** asset.decimals).toString();
    return { amount, asset: asset.address };
  }

  async enhancePaymentRequirements(
    paymentRequirements: PaymentRequirements,
    supportedKind: {
      x402Version: number;
      scheme: string;
      network: Network;
      extra?: Record<string, unknown>;
    },
    _facilitatorExtensions: string[],
  ): Promise<PaymentRequirements> {
    return {
      ...paymentRequirements,
      extra: {
        ...(paymentRequirements.extra),
        ...supportedKind.extra,
      },
    };
  }
}
