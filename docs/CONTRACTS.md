# Contract Addresses

## Polkadot Hub Testnet (chain ID: 420420417)

Explorer: [blockscout-testnet.polkadot.io](https://blockscout-testnet.polkadot.io/)

All chain configuration including RPC URLs, contract addresses, and CREATE2 creation codes lives in `src/config/chains.ts`.
Canonical address registry for Polkadot Hub deployments lives in `src/config/polkadot-hub-addresses.ts`.

---

### Privacy Pool

| Contract | Address | Status |
|----------|---------|--------|
| DustPoolV2 | [`0xeACE407DC5Daa41863c83D9f91d345F032D6d6A5`](https://blockscout-testnet.polkadot.io/address/0xeACE407DC5Daa41863c83D9f91d345F032D6d6A5) | Active |

### ZK Verifiers

| Contract | Address | Status |
|----------|---------|--------|
| FflonkVerifier (transaction) | [`0x844d11bD48D85411eE8cD1a7cB0aC00672B1d516`](https://blockscout-testnet.polkadot.io/address/0x844d11bD48D85411eE8cD1a7cB0aC00672B1d516) | Active |
| FflonkSplitVerifier | [`0xBf5054CE2fca574D2fE995FE7a3DbfCaB39BCac9`](https://blockscout-testnet.polkadot.io/address/0xBf5054CE2fca574D2fE995FE7a3DbfCaB39BCac9) | Active |
| FflonkComplianceVerifier | [`0xEC5D6A57b7515E060CbA2b216BeAB4eBD85598b1`](https://blockscout-testnet.polkadot.io/address/0xEC5D6A57b7515E060CbA2b216BeAB4eBD85598b1) | Deployed but disabled (pool compliance verifier set to `address(0)`) |
| Groth16Verifier | [`0xc2837a9Afac387ABe93d49FAE81394892127Cbe5`](https://blockscout-testnet.polkadot.io/address/0xc2837a9Afac387ABe93d49FAE81394892127Cbe5) | Legacy |

### Compliance

| Contract | Address | Status |
|----------|---------|--------|
| TestnetComplianceOracle | [`0xf4f7ca3c361cA2B457Ca6AC9E393B2dad5C6b78b`](https://blockscout-testnet.polkadot.io/address/0xf4f7ca3c361cA2B457Ca6AC9E393B2dad5C6b78b) | Active |

### Stealth Transfers (ERC-5564 / ERC-6538)

| Contract | Address | Status |
|----------|---------|--------|
| ERC5564Announcer | [`0xF3A09e52EC766BC3c1bA1421870d30D5f27807F1`](https://blockscout-testnet.polkadot.io/address/0xF3A09e52EC766BC3c1bA1421870d30D5f27807F1) | Active |
| ERC6538Registry | [`0xE0091B2bf2e74d28A8106D077E21C32Bc2616ca4`](https://blockscout-testnet.polkadot.io/address/0xE0091B2bf2e74d28A8106D077E21C32Bc2616ca4) | Active |
| ERC5564Announcer (legacy) | [`0xf16bA2643D03f9f3d6b1e8B66327eC5Fc9b69862`](https://blockscout-testnet.polkadot.io/address/0xf16bA2643D03f9f3d6b1e8B66327eC5Fc9b69862) | Deprecated |
| ERC6538Registry (legacy) | [`0x60B6Fdb142AFfc43520027efC852C8418a2c436a`](https://blockscout-testnet.polkadot.io/address/0x60B6Fdb142AFfc43520027efC852C8418a2c436a) | Deprecated |

### Wallet and Relayer

| Contract | Address | Status |
|----------|---------|--------|
| StealthWalletFactory | [`0x29365d51Ff8007dCC7ae6c62aF450e5c8C3263f7`](https://blockscout-testnet.polkadot.io/address/0x29365d51Ff8007dCC7ae6c62aF450e5c8C3263f7) | Active |
| StealthWalletFactory (legacy) | [`0x11e73abC581190B9fe31B804a5877aB5C2754C64`](https://blockscout-testnet.polkadot.io/address/0x11e73abC581190B9fe31B804a5877aB5C2754C64) | Deprecated |
| StealthRelayer | [`0x52b6622fa8057b2180E0E87B0da9E3a30093751d`](https://blockscout-testnet.polkadot.io/address/0x52b6622fa8057b2180E0E87B0da9E3a30093751d) | Active |

### Name Resolution

| Contract | Address | Status |
|----------|---------|--------|
| NameRegistryMerkle | [`0xe38125aD4AFB5e77B2682bc89B32e2D5EC5ED942`](https://blockscout-testnet.polkadot.io/address/0xe38125aD4AFB5e77B2682bc89B32e2D5EC5ED942) | Active |
| NameRegistryMerkle (legacy) | [`0x72f0bd8d014cdB045efD33311028A3013769d69F`](https://blockscout-testnet.polkadot.io/address/0x72f0bd8d014cdB045efD33311028A3013769d69F) | Deprecated |

### Swaps and AMM

| Contract | Address | Status |
|----------|---------|--------|
| PrivacyAMM | [`0x342323c63D0aB15082E1cb2C344327397A3f4a8E`](https://blockscout-testnet.polkadot.io/address/0x342323c63D0aB15082E1cb2C344327397A3f4a8E) | Active |
| DustSwapPoolNative | [`0x2476aBF8B523625f548cFAA446324fe61eeD69FC`](https://blockscout-testnet.polkadot.io/address/0x2476aBF8B523625f548cFAA446324fe61eeD69FC) | Active |
| DustSwapPoolERC20 | [`0xb42c9cdAbf51dDbb412c417628cA42d5D8130543`](https://blockscout-testnet.polkadot.io/address/0xb42c9cdAbf51dDbb412c417628cA42d5D8130543) | Active |
| DustSwapAdapterV2 | [`0x8d56E94a02F06320BDc68FAfE23DEc9Ad7463496`](https://blockscout-testnet.polkadot.io/address/0x8d56E94a02F06320BDc68FAfE23DEc9Ad7463496) | Deprecated -- swaps now use a two-tx pattern (withdraw then swap) instead of the adapter contract |

### Tokens

| Token | Address | Decimals |
|-------|---------|----------|
| WPAS (Wrapped PAS) | [`0x97b74D21ca46c3CaB2918fF10c8418c606223638`](https://blockscout-testnet.polkadot.io/address/0x97b74D21ca46c3CaB2918fF10c8418c606223638) | 18 |
| MockUSDC | [`0xA3896E6B05d94F3182279b60b68A6e43Bf3ab5A9`](https://blockscout-testnet.polkadot.io/address/0xA3896E6B05d94F3182279b60b68A6e43Bf3ab5A9) | 6 |

### Cross-Chain

| Contract | Address | Status |
|----------|---------|--------|
| StealthXCMBridge | [`0x227fa1436eeb76E866e8a36AF0d590B447A40B47`](https://blockscout-testnet.polkadot.io/address/0x227fa1436eeb76E866e8a36AF0d590B447A40B47) | Active |
