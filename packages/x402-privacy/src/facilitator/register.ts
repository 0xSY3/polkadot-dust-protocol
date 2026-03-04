import type { Network } from "@x402/core/types";
import {
  ShieldedEvmFacilitatorScheme,
  type ShieldedFacilitatorOptions,
} from "./scheme";
import type { FacilitatorEvmSigner } from "./types";

export interface ShieldedFacilitatorConfig extends ShieldedFacilitatorOptions {
  signer: FacilitatorEvmSigner;
  networks: Network | Network[];
}

export function registerShieldedEvmScheme(
  facilitator: {
    register: (
      networks: Network | Network[],
      scheme: ShieldedEvmFacilitatorScheme,
    ) => void;
  },
  config: ShieldedFacilitatorConfig,
): void {
  facilitator.register(
    config.networks,
    new ShieldedEvmFacilitatorScheme(config.signer, config),
  );
}
