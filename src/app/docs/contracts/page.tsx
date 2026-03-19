import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsBadge } from "@/components/docs/DocsBadge";
import { docsMetadata } from "@/lib/seo/metadata";

const EXPLORER = "https://blockscout-testnet.polkadot.io/address";

const polkadotHubContracts = [
  {
    name: "ERC5564Announcer",
    address: "0xF3A09e52EC766BC3c1bA1421870d30D5f27807F1",
    role: "Emits Announcement events when PAS is sent to a stealth address. The discovery mechanism for all incoming payments.",
    standard: "ERC-5564",
    explorer: `${EXPLORER}/0xF3A09e52EC766BC3c1bA1421870d30D5f27807F1`,
  },
  {
    name: "ERC6538Registry",
    address: "0xE0091B2bf2e74d28A8106D077E21C32Bc2616ca4",
    role: "Maps wallet addresses to stealth meta-addresses. Used for no-opt-in payments to any address that has registered.",
    standard: "ERC-6538",
    explorer: `${EXPLORER}/0xE0091B2bf2e74d28A8106D077E21C32Bc2616ca4`,
  },
  {
    name: "StealthNameRegistry",
    address: "0xe38125aD4AFB5e77B2682bc89B32e2D5EC5ED942",
    role: "Maps .dust names to stealth meta-addresses (Merkle-based). Supports register, update, transfer, and sub-accounts.",
    standard: "Custom",
    explorer: `${EXPLORER}/0xe38125aD4AFB5e77B2682bc89B32e2D5EC5ED942`,
  },
  {
    name: "StealthWalletFactory",
    address: "0x29365d51Ff8007dCC7ae6c62aF450e5c8C3263f7",
    role: "Deploys StealthWallet contracts at CREATE2 addresses for stealth claims via EIP-712 sponsor-relay pattern.",
    standard: "Custom",
    explorer: `${EXPLORER}/0x29365d51Ff8007dCC7ae6c62aF450e5c8C3263f7`,
  },
  {
    name: "StealthWalletFactory (Legacy)",
    address: "0x11e73abC581190B9fe31B804a5877aB5C2754C64",
    role: "Legacy stealth wallet factory. Still used for backward-compatible claim flows.",
    standard: "Custom",
    explorer: `${EXPLORER}/0x11e73abC581190B9fe31B804a5877aB5C2754C64`,
  },
  {
    name: "DustPoolV2",
    address: "0xeACE407DC5Daa41863c83D9f91d345F032D6d6A5",
    role: "V2 ZK-UTXO privacy pool. Arbitrary-amount PAS deposits, FFLONK proof verification, split withdrawals. Compliance verifier disabled for testnet (address(0)). Merkle tree depth 20 (~1M commitments).",
    standard: "ZK-UTXO / FFLONK",
    explorer: `${EXPLORER}/0xeACE407DC5Daa41863c83D9f91d345F032D6d6A5`,
  },
  {
    name: "DustPoolV2 Verifier (FFLONK)",
    address: "0x844d11bD48D85411eE8cD1a7cB0aC00672B1d516",
    role: "On-chain FFLONK proof verifier for DustPoolV2 transaction circuit (2-in-2-out, 9 public signals).",
    standard: "FFLONK",
    explorer: `${EXPLORER}/0x844d11bD48D85411eE8cD1a7cB0aC00672B1d516`,
  },
  {
    name: "DustPoolV2 Split Verifier (FFLONK)",
    address: "0xBf5054CE2fca574D2fE995FE7a3DbfCaB39BCac9",
    role: "On-chain FFLONK proof verifier for DustPoolV2 split circuit (2-in-8-out, 15 public signals). Used for denomination privacy.",
    standard: "FFLONK",
    explorer: `${EXPLORER}/0xBf5054CE2fca574D2fE995FE7a3DbfCaB39BCac9`,
  },
  {
    name: "DustPoolV2 Compliance Verifier (FFLONK)",
    address: "0xEC5D6A57b7515E060CbA2b216BeAB4eBD85598b1",
    role: "On-chain FFLONK compliance proof verifier. Deployed but DISABLED for testnet — DustPoolV2.complianceVerifier is set to address(0).",
    standard: "FFLONK",
    explorer: `${EXPLORER}/0xEC5D6A57b7515E060CbA2b216BeAB4eBD85598b1`,
  },
  {
    name: "ComplianceOracle",
    address: "0xf4f7ca3c361cA2B457Ca6AC9E393B2dad5C6b78b",
    role: "Compliance oracle for deposit screening. Deployed but screening is currently disabled for testnet.",
    standard: "Custom",
    explorer: `${EXPLORER}/0xf4f7ca3c361cA2B457Ca6AC9E393B2dad5C6b78b`,
  },
  {
    name: "PrivacyAMM",
    address: "0x342323c63D0aB15082E1cb2C344327397A3f4a8E",
    role: "AMM for private token swaps on Polkadot Hub. Hosts the WPAS/MockUSDC pool. Used via two-tx swap pattern (pallet-revive depth limit).",
    standard: "Custom",
    explorer: `${EXPLORER}/0x342323c63D0aB15082E1cb2C344327397A3f4a8E`,
  },
  {
    name: "WPAS (Wrapped PAS)",
    address: "0x97b74D21ca46c3CaB2918fF10c8418c606223638",
    role: "Wrapped PAS ERC-20 token. Native PAS must be wrapped to WPAS for AMM compatibility.",
    standard: "ERC-20",
    explorer: `${EXPLORER}/0x97b74D21ca46c3CaB2918fF10c8418c606223638`,
  },
  {
    name: "MockUSDC",
    address: "0xA3896E6B05d94F3182279b60b68A6e43Bf3ab5A9",
    role: "Mintable test USDC token for Polkadot Hub Testnet. Real USDC is not yet available on this chain.",
    standard: "ERC-20",
    explorer: `${EXPLORER}/0xA3896E6B05d94F3182279b60b68A6e43Bf3ab5A9`,
  },
  {
    name: "DustSwap Pool (Native/WPAS)",
    address: "0x2476aBF8B523625f548cFAA446324fe61eeD69FC",
    role: "Privacy AMM pool for native PAS (as WPAS) token swaps.",
    standard: "Custom",
    explorer: `${EXPLORER}/0x2476aBF8B523625f548cFAA446324fe61eeD69FC`,
  },
  {
    name: "DustSwap Pool (ERC-20/MockUSDC)",
    address: "0xb42c9cdAbf51dDbb412c417628cA42d5D8130543",
    role: "Privacy AMM pool for MockUSDC token swaps.",
    standard: "Custom",
    explorer: `${EXPLORER}/0xb42c9cdAbf51dDbb412c417628cA42d5D8130543`,
  },
  {
    name: "StealthXCMBridge",
    address: "0x227fa1436eeb76E866e8a36AF0d590B447A40B47",
    role: "Cross-chain stealth transfer bridge via XCM messaging between Polkadot parachains.",
    standard: "XCM",
    explorer: `${EXPLORER}/0x227fa1436eeb76E866e8a36AF0d590B447A40B47`,
  },
];

export const metadata = docsMetadata("Smart Contracts — Deployed Addresses & Standards", "All Dust Protocol smart contract addresses on Polkadot Hub TestNet (chain 420420417, pallet-revive). Includes ERC-5564 Announcer, ERC-6538 Registry, DustPoolV2, PrivacyAMM, WPAS, MockUSDC, and StealthXCMBridge.", "/docs/contracts");

export default function ContractsPage() {
  return (
    <DocsPage
      currentHref="/docs/contracts"
      title="Smart Contracts"
      subtitle="Deployed contract addresses for all Dust Protocol components on Polkadot Hub Testnet (chain 420420417, pallet-revive). Native currency: PAS."
      badge="TECHNICAL REFERENCE"
    >

      {/* Polkadot Hub Testnet */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-sm font-mono font-semibold text-white tracking-wider uppercase">Polkadot Hub TestNet</h2>
          <span className="text-[10px] font-mono text-[rgba(255,255,255,0.3)]">Chain ID: 420420417</span>
          <DocsBadge variant="muted">Paseo</DocsBadge>
        </div>

        <div className="space-y-2">
          {polkadotHubContracts.map((c) => (
            <div key={c.address} className="border border-[rgba(255,255,255,0.06)] rounded-sm overflow-hidden">
              <div className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="text-[12px] font-mono font-semibold text-white">{c.name}</p>
                    {"standard" in c && (
                      <DocsBadge variant={
                        c.standard.includes("ERC-4337") ? "amber" :
                        c.standard.includes("ZK") || c.standard.includes("Groth16") || c.standard.includes("FFLONK") ? "green" :
                        c.standard.includes("PrivacyAMM") ? "blue" :
                        c.standard.includes("EIP-7702") ? "amber" : "muted"
                      }>{c.standard}</DocsBadge>
                    )}
                  </div>
                  {"role" in c && (
                    <p className="text-xs text-[rgba(255,255,255,0.45)] leading-relaxed mb-2">{c.role}</p>
                  )}
                  <code className="text-[10px] font-mono text-[rgba(0,255,65,0.6)] break-all">{c.address}</code>
                </div>
                <a
                  href={c.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] font-mono text-[rgba(255,255,255,0.3)] hover:text-[#00FF41] transition-colors pt-1"
                >
                  Explorer ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Source code */}
      <section>
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Source Code</h2>
        <div className="space-y-2">
          {[
            { name: "ERC5564Announcer.sol", path: "contracts/ERC5564Announcer.sol", desc: "ERC-5564 stealth announcement" },
            { name: "ERC6538Registry.sol", path: "contracts/ERC6538Registry.sol", desc: "ERC-6538 meta-address registry" },
            { name: "StealthNameRegistry.sol", path: "contracts/StealthNameRegistry.sol", desc: ".dust name registry" },
            { name: "StealthRelayer.sol", path: "contracts/StealthRelayer.sol", desc: "EIP-712 signed withdrawal relayer (0.5% fee)" },
            { name: "DustPool.sol", path: "contracts/dustpool/src/DustPool.sol", desc: "Privacy pool core contract" },
            { name: "PrivacyAMM.sol", path: "contracts/privacyamm/src/PrivacyAMM.sol", desc: "Privacy-preserving AMM for Polkadot Hub" },
            { name: "DustPoolV2.sol", path: "contracts/dustpool/src/DustPoolV2.sol", desc: "V2 ZK-UTXO privacy pool (FFLONK, split withdrawals, compliance)" },
            { name: "DustV2Transaction.circom", path: "contracts/dustpool/circuits/v2/DustV2Transaction.circom", desc: "2-in-2-out transaction circuit (12,400 constraints)" },
            { name: "DustV2Split.circom", path: "contracts/dustpool/circuits/v2/DustV2Split.circom", desc: "2-in-8-out split circuit (32,074 constraints)" },
            { name: "ChainalysisScreener.sol", path: "contracts/dustpool/src/ChainalysisScreener.sol", desc: "Compliance oracle wrapper for deposit screening" },
          ].map(({ name, path, desc }) => (
            <div key={name} className="flex items-center gap-4 px-3 py-2.5 border border-[rgba(255,255,255,0.04)] rounded-sm hover:border-[rgba(255,255,255,0.08)] transition-colors">
              <code className="text-[11px] font-mono text-[#00FF41] shrink-0">{name}</code>
              <span className="text-xs text-[rgba(255,255,255,0.3)] flex-1 min-w-0 truncate">{path}</span>
              <span className="text-xs text-[rgba(255,255,255,0.4)] shrink-0 hidden sm:block">{desc}</span>
            </div>
          ))}
        </div>
      </section>
    </DocsPage>
  );
}
