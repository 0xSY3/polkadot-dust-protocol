import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsBadge } from "@/components/docs/DocsBadge";
import { AccountTypeSwitcher } from "@/components/docs/visuals/AccountTypeSwitcher";
import { docsMetadata } from "@/lib/seo/metadata";

export const metadata = docsMetadata("Account Types — Gasless Stealth Claims on Polkadot Hub", "How Dust works with EOA and CREATE2 StealthWallet account types on Polkadot Hub Testnet. EIP-7702 and ERC-4337 are not supported by pallet-revive. Claims use the EIP-712 sponsor-relay pattern.", "/docs/eip-7702");

export default function Eip7702Page() {
  return (
    <DocsPage
      currentHref="/docs/eip-7702"
      title="Account Types"
      subtitle="Dust on Polkadot Hub uses the EIP-712 sponsor-relay StealthWallet pattern for gasless claims. EIP-7702 and ERC-4337 are not supported by pallet-revive."
      badge="ACCOUNT & SECURITY"
    >

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Account Types on Polkadot Hub</h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-6">
          Polkadot Hub uses pallet-revive, which supports a subset of EVM features. ERC-4337 (EntryPoint/Paymaster)
          and EIP-7702 are not available. Dust uses the <strong>EIP-712 sponsor-relay StealthWallet</strong> pattern
          for all gasless stealth claims — a CREATE2 wallet is deployed and drained atomically, with gas paid by a
          sponsor relayer (0.5% fee).
        </p>

        <div className="mb-8">
          <AccountTypeSwitcher />
        </div>

        <div className="space-y-4">
          {/* EOA */}
          <div className="border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden">
            <div className="px-4 py-3 bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
              <p className="text-[12px] font-mono font-semibold text-white">Standard EOA</p>
              <DocsBadge variant="muted">Externally Owned Account</DocsBadge>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-[rgba(255,255,255,0.55)] leading-relaxed mb-3">
                A regular Ethereum private key account. Dust derives a per-stealth-address private key and uses
                it directly to sign and broadcast a transfer transaction. Requires PAS for gas — typically
                handled by the DustPaymaster sponsorship.
              </p>
              <div className="flex gap-3 text-xs font-mono">
                <span className="text-[rgba(0,255,65,0.7)]">✓ Universally compatible</span>
                <span className="text-[rgba(255,255,255,0.3)]">· Needs relayer for gas</span>
              </div>
            </div>
          </div>

          {/* Sponsor Relay (Active) */}
          <div className="border border-[rgba(0,255,65,0.12)] rounded-sm overflow-hidden">
            <div className="px-4 py-3 bg-[rgba(0,255,65,0.03)] flex items-center justify-between">
              <p className="text-[12px] font-mono font-semibold text-white">EIP-712 Sponsor Relay (StealthWallet)</p>
              <DocsBadge variant="green">Default on Polkadot Hub</DocsBadge>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-[rgba(255,255,255,0.55)] leading-relaxed mb-3">
                Default for stealth claims on Polkadot Hub. The stealth private key signs an{" "}
                <strong>EIP-712 message</strong> locally. The sponsor relayer submits it to the{" "}
                <code>StealthWalletFactory</code>, which deploys a <code>StealthWallet</code> at the CREATE2
                stealth address and immediately drains its balance to the recipient&apos;s claim address.
                Gas is paid by the sponsor relayer (0.5% fee). This replaces ERC-4337 because pallet-revive
                does not support EntryPoint/Paymaster.
              </p>
              <div className="flex flex-wrap gap-3 text-xs font-mono">
                <span className="text-[rgba(0,255,65,0.7)]">✓ Gasless for recipient</span>
                <span className="text-[rgba(0,255,65,0.7)]">✓ Atomic deploy + drain</span>
                <span className="text-[rgba(0,255,65,0.7)]">✓ Default for Dust on Polkadot Hub</span>
              </div>
            </div>
          </div>

          {/* CREATE2 */}
          <div className="border border-[rgba(255,255,255,0.07)] rounded-sm overflow-hidden">
            <div className="px-4 py-3 bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
              <p className="text-[12px] font-mono font-semibold text-white">CREATE2 Wallet</p>
              <DocsBadge variant="muted">Counterfactual</DocsBadge>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-[rgba(255,255,255,0.55)] leading-relaxed mb-3">
                A minimal smart wallet deployed at a deterministic address using CREATE2. The address is
                pre-computable from the stealth key without deploying first — funds can be sent before the
                wallet exists on-chain, and deployment + drain happen in one sponsored transaction.
              </p>
              <div className="flex gap-3 text-xs font-mono">
                <span className="text-[rgba(0,255,65,0.7)]">✓ Deterministic address</span>
                <span className="text-[rgba(255,255,255,0.3)]">· Requires sponsor</span>
              </div>
            </div>
          </div>

          {/* EIP-7702 */}
          <div className="border border-[rgba(255,176,0,0.15)] rounded-sm overflow-hidden">
            <div className="px-4 py-3 bg-[rgba(255,176,0,0.03)] flex items-center justify-between">
              <p className="text-[12px] font-mono font-semibold text-white">EIP-7702 — EOA as Smart Account</p>
              <DocsBadge variant="amber">Not Available</DocsBadge>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-[rgba(255,255,255,0.55)] leading-relaxed mb-3">
                EIP-7702 allows an EOA to temporarily adopt the bytecode of a smart contract within a single
                transaction. <strong>This is not supported on Polkadot Hub</strong> because pallet-revive does
                not implement this feature. Dust uses the EIP-712 sponsor-relay StealthWallet pattern instead.
              </p>
              <p className="text-xs text-[rgba(255,255,255,0.55)] leading-relaxed mb-3">
                If EIP-7702 becomes available on Polkadot Hub in the future, it would enable:
              </p>
              <ul className="space-y-1.5 mb-3">
                {[
                  "Batch claims from multiple stealth addresses in one tx",
                  "Social recovery of a stealth key (sign with guardian)",
                  "Auto-routing output to Privacy Pool deposit in one step",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs text-[rgba(255,255,255,0.5)]">
                    <span className="text-[#FFB000] shrink-0">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 text-xs font-mono">
                <span className="text-[rgba(255,176,0,0.8)]">✗ Not supported on pallet-revive</span>
                <span className="text-[rgba(255,255,255,0.3)]">· May be available in future Polkadot Hub upgrades</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DocsCallout type="info" title="Which type does Dust use on Polkadot Hub?">
        Dust uses the <strong>EIP-712 sponsor-relay StealthWallet</strong> pattern for all stealth claims
        on Polkadot Hub. Neither ERC-4337 nor EIP-7702 are supported by pallet-revive. The sponsor relayer
        pays gas and takes a 0.5% fee from the claimed amount.
      </DocsCallout>

      <section className="mt-8">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-4 uppercase">Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                {["Account Type", "Gasless", "Smart Logic", "Deploy Needed", "EIP"].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-[rgba(255,255,255,0.3)] font-normal tracking-wider uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {[
                ["EOA", "Via relayer", "✗", "✗", "—"],
                ["StealthWallet (CREATE2)", "✓ Sponsor relay", "✓ (deploy+drain)", "✓ (atomic)", "EIP-712"],
                ["ERC-4337", "✗ Not on pallet-revive", "✓", "✓ (atomic)", "ERC-4337"],
                ["EIP-7702", "✗ Not on pallet-revive", "✓ (ephemeral)", "✗", "EIP-7702"],
              ].map(([type, ...rest]) => (
                <tr key={type} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="py-2.5 pr-4 text-white">{type}</td>
                  {rest.map((v, i) => (
                    <td key={i} className={`py-2.5 pr-4 ${v.startsWith("✓") ? "text-[#00FF41]" : v === "✗" ? "text-[rgba(255,255,255,0.25)]" : "text-[rgba(255,255,255,0.5)]"}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DocsPage>
  );
}
