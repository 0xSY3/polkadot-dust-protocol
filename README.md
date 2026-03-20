# Dust Protocol

Dust is a private finance protocol on Polkadot Hub. It has three main primitives: **stealth transfers**, **privacy pools**, and **privacy swaps**.

Stealth transfers let you send PAS or tokens to anyone without creating an on-chain link between sender and recipient. Every payment goes to a one-time address derived through ECDH — nobody watching the chain can associate it with the recipient's identity. `.dust` names sit on top so people can share a readable name instead of an address, and the whole mechanism works with any wallet without requiring the sender to run stealth-aware software.

DustPool V2 is a ZK-UTXO privacy pool with arbitrary-amount deposits and withdrawals. It uses a 2-in-2-out UTXO model with hidden amounts (Pedersen commitments), FFLONK proofs (no trusted setup, 22% cheaper than Groth16 with 8+ public signals), and an off-chain global Merkle tree maintained by a relayer. A 2-in-8-out split circuit provides denomination privacy by breaking withdrawals into common-sized chunks, defeating amount-based correlation.

Privacy swaps let you trade PAS for USDC without on-chain traceability. You deposit into the ZK pool, generate a proof in-browser, and the relayer executes a two-transaction swap: first withdrawing from the pool, then swapping on the PrivacyAMM. Output lands back in the pool under a new commitment with no linkage to the original deposit.

---

## Features

### Stealth Transfers
- **ECDH stealth addresses** (ERC-5564 / ERC-6538) on secp256k1
- **`.dust` names** — human-readable payment endpoints with sub-address support
- **Gasless claims** via CREATE2 wallets with relayer-sponsored gas
- **PIN-based key derivation** — wallet signature + 6-digit PIN through PBKDF2 (100K iterations)
- **Private keys in memory only** — React refs, never persisted to localStorage or sent to any server

### DustPool V2 — ZK-UTXO Privacy Pool
- **Arbitrary amounts** — no fixed denominations for deposits/withdrawals
- **2-in-2-out UTXO circuit** — 12,420 R1CS constraints, FFLONK proof system
- **2-in-8-out split circuit** — 32,074 R1CS constraints, breaks withdrawals into common denomination chunks for amount privacy
- **Denomination engine** — auto-splits PAS withdrawals into chunks from a standard set (100K, 50K, 10K, 5K, 1K, 500, 100, 50, 10, 5, 1 PAS); USDC uses a separate table (10K down to $1)
- **Batch deposits** — up to 8 commitments per transaction
- **Batch withdrawals** — relayer shuffles execution order with timing jitter to prevent FIFO correlation
- **Off-chain Merkle tree** (depth 20, ~1M capacity) maintained by relayer with checkpoint persistence
- **IndexedDB note encryption** — AES-256-GCM via Web Crypto API, key derived from spending key
- **Pool state** — 988 PAS deposited (testnet)

### Compliance & Sanctions Screening (Currently Disabled)

The compliance system is architecturally complete but **disabled on-chain** — the compliance verifier is set to `address(0)` on the deployed DustPoolV2 contract. When the verifier address is zero, the contract skips all compliance checks. The system can be re-enabled by the owner calling `setComplianceVerifier()` with a non-zero verifier address.

When enabled, the compliance stack provides:
- **Deposit screening** — configurable compliance oracle
- **Post-deposit cooldown** — 1-hour standby period after deposit (Unshield-Only Standby pattern)
- **ZK exclusion proofs** — proves a commitment is NOT in the sanctions exclusion set without revealing the commitment
  - DustV2Compliance circuit: ~6,884 R1CS constraints, FFLONK proof, 2 public signals (exclusionRoot, nullifier)
  - Sparse Merkle Tree (20 levels) of flagged commitments, maintained off-chain by relayer
  - Pre-call compliance pattern: `verifyComplianceProof()` sets flag, `withdraw()`/`withdrawSplit()` consumes it
- **View keys & selective disclosure** — signed disclosure statements with CSV/PDF export for auditors

### Privacy Swaps (Two-Transaction Pattern)

Polkadot Hub uses `pallet-revive` (not `pallet-evm`), which has a call depth limitation that prevents the original atomic adapter contract pattern. Swaps use a **two-transaction pattern** instead:

1. **TX1: Withdraw** — ZK proof verified, funds withdrawn from pool to the relayer wallet
2. **TX2: Swap** — Relayer wraps PAS to WPAS (if needed), approves the PrivacyAMM, and executes `vanillaSwap()`
3. **TX3: Re-deposit** — Swap output deposited back into the pool under a new commitment owned by the user

The relayer orchestrates all three transactions server-side. The user only submits a single request with their ZK proof.

- **WPAS/USDC pair** on PrivacyAMM (constant-product AMM)
- **AMM liquidity** — 571 WPAS / 1.06M USDC (testnet)
- **1% default slippage** — configurable per swap
- **2% relayer fee** (200 basis points), capped at 500 bps

### Security Hardening
- **Pausable** — owner can pause all deposits/withdrawals
- **Ownable2Step** — two-step ownership transfer prevents accidental loss
- **Chain ID as public signal** — all circuits include `block.chainid` to prevent cross-chain replay
- **Solvency tracking** — `totalDeposited` per asset, prevents pool drain beyond deposits
- **Duplicate commitment protection** — each commitment can only be deposited once
- **Null nullifier guard** — prevents permanent slot poisoning via `nullifier0 == bytes32(0)`
- **Persistent rate limiting** — relayer cooldowns survive restarts via `/tmp` persistence

---

## How It Works

### Stealth Key Derivation

```
wallet_signature = sign("Dust Protocol stealth key", walletAddress)
entropy = PBKDF2(wallet_signature + PIN, salt_v2, 100000 iterations, SHA-512)
spendKey = entropy[0:32]   // secp256k1 scalar
viewKey  = entropy[32:64]  // secp256k1 scalar
metaAddress = (spendKey * G, viewKey * G)  // registered on ERC-6538
```

### DustPool V2 — UTXO Model

**Deposit:**
- Browser generates `spendingKey`, `nullifierKey` from wallet signature + PIN
- `commitment = Poseidon(amount, asset, spendingKey, nullifierKey, randomBlinding)`
- Commitment queued on-chain, relayer inserts into off-chain Merkle tree

**Withdraw (2-in-2-out):**
- Browser fetches Merkle proof from relayer
- Generates FFLONK proof: proves ownership of 2 input UTXOs, creates 2 output UTXOs
- 9 public signals: `[merkleRoot, nullifier0, nullifier1, outCommitment0, outCommitment1, publicAmount, publicAsset, recipient, chainId]`
- Relayer submits on-chain — contract verifies proof, marks nullifiers spent, transfers funds

**Split Withdraw (2-in-8-out):**
- Same as above but creates up to 8 output commitments
- 15 public signals: `[merkleRoot, null0, null1, outCommitment[8], publicAmount, publicAsset, recipient, chainId]`
- Denomination engine auto-selects optimal split for maximum anonymity set overlap

### Stealth Claim Flow

```
1. Scanner detects stealth payment via ERC-5564 announcement log
2. Browser derives stealth private key (ECDH + spendKey)
3. POST /api/bundle — server builds claim transaction
4. Browser signs with stealth key (never leaves browser)
5. POST /api/bundle/submit — server submits to chain
6. StealthWalletFactory deploys wallet (CREATE2) and drains funds — one tx
```

---

## Network

| Network | Chain ID | Currency | Explorer |
|---------|----------|----------|----------|
| Polkadot Hub Testnet | `420420417` | PAS | [blockscout-testnet.polkadot.io](https://blockscout-testnet.polkadot.io/) |

`.dust` name registry is canonical on Polkadot Hub.

### Contract Addresses

**Privacy Pool and Verifiers:**

| Contract | Address |
|----------|---------|
| DustPoolV2 | [`0xeACE407DC5Daa41863c83D9f91d345F032D6d6A5`](https://blockscout-testnet.polkadot.io/address/0xeACE407DC5Daa41863c83D9f91d345F032D6d6A5) |
| FFLONKVerifier | [`0x844d11bD48D85411eE8cD1a7cB0aC00672B1d516`](https://blockscout-testnet.polkadot.io/address/0x844d11bD48D85411eE8cD1a7cB0aC00672B1d516) |
| FFLONKSplitVerifier | [`0xBf5054CE2fca574D2fE995FE7a3DbfCaB39BCac9`](https://blockscout-testnet.polkadot.io/address/0xBf5054CE2fca574D2fE995FE7a3DbfCaB39BCac9) |
| FFLONKComplianceVerifier | [`0xEC5D6A57b7515E060CbA2b216BeAB4eBD85598b1`](https://blockscout-testnet.polkadot.io/address/0xEC5D6A57b7515E060CbA2b216BeAB4eBD85598b1) |

**Stealth and Name Resolution:**

| Contract | Address |
|----------|---------|
| ERC5564Announcer | [`0xF3A09e52EC766BC3c1bA1421870d30D5f27807F1`](https://blockscout-testnet.polkadot.io/address/0xF3A09e52EC766BC3c1bA1421870d30D5f27807F1) |
| ERC6538Registry | [`0xE0091B2bf2e74d28A8106D077E21C32Bc2616ca4`](https://blockscout-testnet.polkadot.io/address/0xE0091B2bf2e74d28A8106D077E21C32Bc2616ca4) |
| NameRegistryMerkle | [`0xe38125aD4AFB5e77B2682bc89B32e2D5EC5ED942`](https://blockscout-testnet.polkadot.io/address/0xe38125aD4AFB5e77B2682bc89B32e2D5EC5ED942) |

**Wallet and Relayer:**

| Contract | Address |
|----------|---------|
| StealthWalletFactory | [`0x29365d51Ff8007dCC7ae6c62aF450e5c8C3263f7`](https://blockscout-testnet.polkadot.io/address/0x29365d51Ff8007dCC7ae6c62aF450e5c8C3263f7) |
| LegacyStealthWalletFactory | [`0x11e73abC581190B9fe31B804a5877aB5C2754C64`](https://blockscout-testnet.polkadot.io/address/0x11e73abC581190B9fe31B804a5877aB5C2754C64) |

**Swaps and AMM:**

| Contract | Address |
|----------|---------|
| PrivacyAMM | [`0x342323c63D0aB15082E1cb2C344327397A3f4a8E`](https://blockscout-testnet.polkadot.io/address/0x342323c63D0aB15082E1cb2C344327397A3f4a8E) |
| WPAS | [`0x97b74D21ca46c3CaB2918fF10c8418c606223638`](https://blockscout-testnet.polkadot.io/address/0x97b74D21ca46c3CaB2918fF10c8418c606223638) |
| MockUSDC | [`0xA3896E6B05d94F3182279b60b68A6e43Bf3ab5A9`](https://blockscout-testnet.polkadot.io/address/0xA3896E6B05d94F3182279b60b68A6e43Bf3ab5A9) |
| DustSwapPoolNative | [`0x2476aBF8B523625f548cFAA446324fe61eeD69FC`](https://blockscout-testnet.polkadot.io/address/0x2476aBF8B523625f548cFAA446324fe61eeD69FC) |
| DustSwapPoolERC20 | [`0xb42c9cdAbf51dDbb412c417628cA42d5D8130543`](https://blockscout-testnet.polkadot.io/address/0xb42c9cdAbf51dDbb412c417628cA42d5D8130543) |

**Cross-Chain:**

| Contract | Address |
|----------|---------|
| StealthXCMBridge | [`0x227fa1436eeb76E866e8a36AF0d590B447A40B47`](https://blockscout-testnet.polkadot.io/address/0x227fa1436eeb76E866e8a36AF0d590B447A40B47) |

**Tokens:**

| Token | Address | Decimals | Notes |
|-------|---------|----------|-------|
| PAS | Native | 18 | Polkadot Hub testnet native token |
| WPAS | [`0x97b74D21ca46c3CaB2918fF10c8418c606223638`](https://blockscout-testnet.polkadot.io/address/0x97b74D21ca46c3CaB2918fF10c8418c606223638) | 18 | Wrapped PAS — required because the AMM operates on ERC-20 tokens |
| MockUSDC | [`0xA3896E6B05d94F3182279b60b68A6e43Bf3ab5A9`](https://blockscout-testnet.polkadot.io/address/0xA3896E6B05d94F3182279b60b68A6e43Bf3ab5A9) | 6 | Testnet mock — real USDC is not deployed on Polkadot Hub Testnet |

Full address list: [`docs/CONTRACTS.md`](docs/CONTRACTS.md)

---

## Pallet-Revive Compatibility

Polkadot Hub runs `pallet-revive` instead of `pallet-evm`. This has several implications for the protocol:

### Receipt Status Reporting

`pallet-revive` has a known bug where transaction receipts report `status: 0` (failure) even when the transaction succeeded. The codebase works around this by **verifying on-chain state** instead of trusting receipt status:

- For withdrawals: checks `pool.nullifiers(nullifierHex)` to confirm the nullifier was spent
- For deposits and approvals: fetches the receipt directly via `provider.getTransactionReceipt()` and proceeds if a receipt exists
- All hooks and API routes (`useV2Withdraw`, `usePolkadotWithdraw`, `useV2Split`, swap routes) implement this pattern

### Call Depth Limitation

`pallet-revive` restricts the EVM call depth more aggressively than standard EVM implementations. This prevents the atomic `DustSwapAdapterV2` contract pattern (which requires pool -> adapter -> AMM nested calls). Swaps use the two-transaction pattern described above instead.

### Storage Deposits

Contract creation on `pallet-revive` requires a storage deposit. The `StealthWalletFactory.deploy()` function is `payable` to forward the storage deposit required for CREATE2 wallet deployment. The relayer includes the storage deposit value when sponsoring wallet creation.

### Block Time

Polkadot Hub produces blocks every 6 seconds. Receipt timeouts are set accordingly (20 seconds vs the 120 seconds used on Ethereum L2s).

### Existential Deposit

Accounts below 0.01 PAS get reaped. The protocol enforces a minimum claimable balance of 0.01 PAS to prevent accounts from being destroyed.

---

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Environment Variables

```env
# Required — relayer key for gas sponsorship
RELAYER_PRIVATE_KEY=<private-key>

# Polkadot Hub RPC
NEXT_PUBLIC_POLKADOT_HUB_RPC=https://eth-rpc-testnet.polkadot.io/

# Optional — The Graph for faster name lookups
NEXT_PUBLIC_SUBGRAPH_URL_POLKADOT_HUB=https://api.studio.thegraph.com/query/<id>/dust-protocol-polkadot-hub/version/latest
NEXT_PUBLIC_USE_GRAPH=true

# Optional — CDN-hosted FFLONK proving keys (223-283 MB each)
NEXT_PUBLIC_V2_ZKEY_URL=<cdn-url>
NEXT_PUBLIC_V2_SPLIT_ZKEY_URL=<cdn-url>
```

### ZK Proving Keys

FFLONK proving keys are 223-283 MB and too large for git. They are downloaded on first use and cached persistently via the browser's Cache API (`caches.open('dust-zkeys-v2')`). Subsequent proof generations skip the network round-trip entirely. Set `NEXT_PUBLIC_V2_ZKEY_URL` / `NEXT_PUBLIC_V2_SPLIT_ZKEY_URL` to serve them from a CDN, or they fall back to the local `public/` directory.

### Running Tests

```bash
# Solidity (Foundry)
cd contracts/dustpool && forge test

# TypeScript
npx vitest run

# Type check
npx tsc --noEmit
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/            # Unified balance + pool UI
│   ├── onboarding/           # PIN setup + name registration
│   ├── swap/                 # Privacy swaps UI
│   ├── pools/                # Pool stats + contract info
│   ├── activities/           # Transaction history
│   ├── links/                # Payment link management
│   ├── settings/             # Account settings
│   ├── pay/[name]/           # Public pay page
│   └── api/
│       ├── v2/               # V2 relayer API routes
│       │   ├── withdraw/     # ZK withdrawal relay
│       │   ├── split-withdraw/ # Split withdrawal relay
│       │   ├── batch-withdraw/ # Batch withdrawal (shuffled + jittered)
│       │   ├── swap/         # Two-tx privacy swap relay
│       │   ├── batch-swap/   # Batched swap relay
│       │   ├── compliance/   # Exclusion compliance witness + proof
│       │   ├── tree/         # Merkle tree root + proof queries
│       │   ├── deposit/      # Deposit status
│       │   └── health/       # Relayer health check
│       ├── bundle/           # Stealth claim build + submit
│       ├── resolve/[name]    # Stealth address generation
│       └── sponsor-*/        # Gas sponsorship endpoints
├── components/
│   ├── layout/               # Navbar
│   ├── dashboard/            # Balance cards, withdraw modal
│   ├── dustpool/             # V2 deposit/withdraw modals
│   ├── onboarding/           # OnboardingWizard
│   └── swap/                 # SwapInterface, PoolStats
├── hooks/
│   ├── stealth/              # useStealthScanner, useUnifiedBalance
│   ├── dustpool/v2/          # useV2Deposit, useV2Withdraw, usePolkadotWithdraw
│   └── swap/                 # useV2Swap, useVanillaSwap, usePoolStats
├── lib/
│   ├── stealth/              # Core ECDH cryptography
│   ├── dustpool/v2/          # V2 contracts, relayer client, zkey cache, compliance, disclosure
│   └── swap/                 # Swap constants, contracts, pool config
├── config/
│   ├── chains.ts             # Chain config, contract addresses, RPC URLs
│   ├── tokens.ts             # Token registry (PAS, WPAS, MockUSDC)
│   └── polkadot-hub-addresses.ts  # Polkadot Hub contract address registry
└── contexts/
    └── AuthContext.tsx        # Wallet, stealth keys, PIN auth

contracts/
├── dustpool/                 # DustPoolV2 + FFLONK verifiers
│   ├── src/
│   │   ├── DustPoolV2.sol           # Main privacy pool contract
│   │   ├── FFLONKVerifier.sol       # Transaction proof verifier (2-in-2-out, 9 signals)
│   │   ├── FFLONKSplitVerifier.sol  # Split proof verifier (2-in-8-out, 15 signals)
│   │   └── FFLONKComplianceVerifier.sol  # Exclusion proof verifier (2 signals)
│   └── circuits/v2/
│       ├── DustV2Transaction.circom  # 2-in-2-out UTXO circuit (12,420 constraints)
│       ├── DustV2Split.circom        # 2-in-8-out split circuit (32,074 constraints)
│       └── DustV2Compliance.circom   # ZK exclusion proof circuit (~6,884 constraints)
├── polkadot-hub/             # Polkadot Hub specific contracts and deployment scripts
├── wallet/                   # StealthWallet + StealthWalletFactory
└── naming/                   # NameRegistryMerkle + NameVerifier

relayer/
└── v2/                       # Off-chain Merkle tree, proof relay, meta-tx support
```

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Stealth address generation | ECDH on secp256k1 — only the recipient can derive the private key |
| Key derivation | PBKDF2 (SHA-512, 100k iterations) over wallet signature + PIN — both required |
| Key isolation | Keys in React ref, never serialized, never sent to server |
| Gasless claim | Client signs locally, server relays — key never leaves browser |
| ZK pool privacy | FFLONK proof — withdrawal is cryptographically unlinkable to deposit |
| Denomination privacy | 2-in-8-out split into common chunks — defeats amount fingerprinting |
| Double-spend prevention | Nullifier stored on-chain, reuse rejected by contract |
| Cross-chain replay | Chain ID as public signal in all circuits + on-chain `block.chainid` check |
| Pool solvency | Per-asset deposit tracking, withdraw cannot exceed total deposits |
| Note encryption | AES-256-GCM (Web Crypto API) for IndexedDB note storage |
| Receipt verification | On-chain state checks instead of receipt status (pallet-revive workaround) |

---

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Blockchain**: wagmi v2, viem v2, ethers.js v5
- **ZK**: circom, snarkjs (FFLONK on BN254), circomlibjs (Poseidon, SMT)
- **Contracts**: Foundry, Solidity 0.8.20
- **Runtime**: Polkadot Hub (`pallet-revive`), 6-second blocks
- **Auth**: wagmi connectors (MetaMask, WalletConnect)
- **Indexing**: The Graph

---

## Research

- [Interactive No-Opt-In Stealth Addresses](https://ethresear.ch/t/interactive-no-opt-in-stealth-addresses/23274) — zemse
- [ERC-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
- [ERC-6538: Stealth Meta-Address Registry](https://ethereum-magicians.org/t/stealth-meta-address-registry/12888)
- [Privacy Pools](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364) — Buterin et al.
- [An Incomplete Guide to Stealth Addresses](https://vitalik.eth.limo/general/2023/01/20/stealth.html) — Vitalik
