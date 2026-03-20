import { type Address } from 'viem';

// Zero address placeholder — replaced after each contract deployment
const TODO: Address = '0x0000000000000000000000000000000000000000';

export interface PolkadotHubContracts {
  // ZK verifiers (deployed unchanged from Ethereum)
  groth16Verifier: Address;
  fflonkVerifier: Address;
  fflonkSplitVerifier: Address;
  fflonkComplianceVerifier: Address;

  // Poseidon hash libraries (linked, not called directly)
  poseidonT3: Address;
  poseidonT6: Address;

  // Core privacy pool
  dustPoolV2: Address;

  // Compliance
  complianceOracle: Address;

  // Stealth transfers (ERC-5564 / ERC-6538)
  announcer: Address;
  registry: Address;
  stealthRelayer: Address;
  stealthWalletFactory: Address;

  // .dust naming
  nameRegistry: Address;
  nameVerifier: Address;

  // Privacy AMM
  privacyAMM: Address;
  dustSwapPoolNative: Address;
  dustSwapPoolERC20: Address;
  stealthXCMBridge: Address;
}

// Polkadot Hub Testnet (Paseo) — chain ID 420420417
export const POLKADOT_HUB_TESTNET_ADDRESSES: PolkadotHubContracts = {
  groth16Verifier: '0xc2837a9Afac387ABe93d49FAE81394892127Cbe5',
  fflonkVerifier: '0x844d11bD48D85411eE8cD1a7cB0aC00672B1d516',
  fflonkSplitVerifier: '0xBf5054CE2fca574D2fE995FE7a3DbfCaB39BCac9',
  fflonkComplianceVerifier: '0xEC5D6A57b7515E060CbA2b216BeAB4eBD85598b1',

  poseidonT3: TODO,
  poseidonT6: TODO,

  dustPoolV2: '0xeACE407DC5Daa41863c83D9f91d345F032D6d6A5',

  complianceOracle: '0xf4f7ca3c361cA2B457Ca6AC9E393B2dad5C6b78b',

  announcer: '0xF3A09e52EC766BC3c1bA1421870d30D5f27807F1',
  registry: '0xE0091B2bf2e74d28A8106D077E21C32Bc2616ca4',
  stealthRelayer: '0x52b6622fa8057b2180E0E87B0da9E3a30093751d',
  stealthWalletFactory: '0x29365d51Ff8007dCC7ae6c62aF450e5c8C3263f7',

  nameRegistry: '0xe38125aD4AFB5e77B2682bc89B32e2D5EC5ED942',
  nameVerifier: TODO,

  privacyAMM: '0x342323c63D0aB15082E1cb2C344327397A3f4a8E',
  dustSwapPoolNative: '0x2476aBF8B523625f548cFAA446324fe61eeD69FC',
  dustSwapPoolERC20: '0xb42c9cdAbf51dDbb412c417628cA42d5D8130543',
  stealthXCMBridge: '0x227fa1436eeb76E866e8a36AF0d590B447A40B47',
};

// Polkadot Hub Mainnet — chain ID 420420419
export const POLKADOT_HUB_MAINNET_ADDRESSES: PolkadotHubContracts = {
  groth16Verifier: TODO,
  fflonkVerifier: TODO,
  fflonkSplitVerifier: TODO,
  fflonkComplianceVerifier: TODO,

  poseidonT3: TODO,
  poseidonT6: TODO,

  dustPoolV2: TODO,

  complianceOracle: TODO,

  announcer: TODO,
  registry: TODO,
  stealthRelayer: TODO,
  stealthWalletFactory: TODO,

  nameRegistry: TODO,
  nameVerifier: TODO,

  privacyAMM: TODO,
  dustSwapPoolNative: TODO,
  dustSwapPoolERC20: TODO,
  stealthXCMBridge: TODO,
};

export const POLKADOT_HUB_CHAIN_IDS = {
  testnet: 420420417,
  mainnet: 420420419,
} as const;

export function getPolkadotHubAddresses(
  chainId: number,
): PolkadotHubContracts {
  switch (chainId) {
    case POLKADOT_HUB_CHAIN_IDS.testnet:
      return POLKADOT_HUB_TESTNET_ADDRESSES;
    case POLKADOT_HUB_CHAIN_IDS.mainnet:
      return POLKADOT_HUB_MAINNET_ADDRESSES;
    default:
      throw new Error(
        `Not a Polkadot Hub chain: ${chainId}. Expected ${POLKADOT_HUB_CHAIN_IDS.testnet} or ${POLKADOT_HUB_CHAIN_IDS.mainnet}`,
      );
  }
}
