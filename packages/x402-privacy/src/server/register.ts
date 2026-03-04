import type { Network } from "@x402/core/types";
import { ShieldedEvmServerScheme } from "./scheme";

export interface ShieldedServerConfig {
  networks?: Network[];
}

export function registerShieldedEvmScheme(
  server: { register: (network: Network, scheme: ShieldedEvmServerScheme) => void },
  config?: ShieldedServerConfig,
): void {
  const scheme = new ShieldedEvmServerScheme();

  if (config?.networks && config.networks.length > 0) {
    for (const network of config.networks) {
      server.register(network, scheme);
    }
  } else {
    server.register("eip155:*" as Network, scheme);
  }
}
