import type { Network } from "@x402/core/types";
import { ShieldedEvmClientScheme, type ShieldedClientOptions } from "./scheme";

export interface ShieldedClientConfig extends ShieldedClientOptions {
  networks?: Network[];
}

export function registerShieldedEvmScheme(
  client: { register: (network: Network, scheme: ShieldedEvmClientScheme) => void },
  config: ShieldedClientConfig,
): void {
  const scheme = new ShieldedEvmClientScheme(config);

  if (config.networks && config.networks.length > 0) {
    for (const network of config.networks) {
      client.register(network, scheme);
    }
  } else {
    client.register("eip155:*" as Network, scheme);
  }
}
