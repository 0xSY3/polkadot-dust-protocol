import { DocsPage } from "@/components/docs/DocsPage";
import { DocsBadge } from "@/components/docs/DocsBadge";
import { DocsCallout } from "@/components/docs/DocsCallout";
import Link from "next/link";
import { PrivacyFlow } from "@/components/docs/visuals/PrivacyFlow";
import { docsMetadata } from "@/lib/seo/metadata";
import { techArticleJsonLd } from "@/lib/seo/jsonLd";

/*
 * XSS-safe: all values below are hardcoded string literals defined in this file.
 * safeJsonLd() in jsonLd.ts escapes '<' as \u003c. No user input flows into this data.
 */
const articleLd = techArticleJsonLd("Overview — Privacy Protocol for Polkadot", "Dust Protocol provides stealth addresses (ERC-5564), ZK-UTXO privacy pools with FFLONK proofs, private token swaps, compliance screening, and gasless claims. Non-custodial privacy for Polkadot.", "/docs/overview");

const features = [
  {
    badge: "ERC-5564 / ERC-6538",
    title: "Stealth Transfers",
    desc: "Send PAS to any .dust name on Polkadot Hub Testnet. Funds land in a one-time stealth address that only the recipient can detect and claim — completely invisible on-chain.",
    href: "/docs/stealth-transfers",
    color: "green",
  },
  {
    badge: "ZK-UTXO / FFLONK",
    title: "Privacy Pool",
    desc: "Deposit arbitrary amounts of PAS into a global UTXO pool. Withdraw with a FFLONK zero-knowledge proof — no on-chain link between deposit and withdrawal. Split withdrawals break amount fingerprinting. Proving keys (~223\u2013283 MB) are cached via the Cache API after first download.",
    href: "/docs/privacy-pool",
    color: "green",
  },
  {
    badge: "PrivacyAMM",
    title: "Privacy Swaps",
    desc: "Swap PAS and MockUSDC privately via PrivacyAMM. A two-transaction pattern (withdraw then swap) replaces the adapter contract due to pallet-revive call depth limits on Polkadot Hub.",
    href: "/docs/privacy-swaps",
    color: "green",
  },
  {
    badge: "View Keys",
    title: "Compliance & Disclosure",
    desc: "1-hour deposit cooldown periods and voluntary view keys for selective disclosure. Compliance verifier is disabled for testnet (verifier = address(0)). Privacy with accountability.",
    href: "/docs/compliance",
    color: "amber",
  },
  {
    badge: "Sponsor Relay",
    title: "Gasless Claims",
    desc: "Stealth wallets are claimed gas-free. Your stealth key signs an EIP-712 message locally; a sponsor relayer deploys a StealthWallet via CREATE2 and drains it atomically.",
    href: "/docs/stealth-transfers",
    color: "amber",
  },
  {
    badge: ".dust names",
    title: "Payment Links",
    desc: "Register a human-readable name like alice.dust and share custom payment links. Track per-link volume and payment count in your dashboard.",
    href: "/docs/payment-links",
    color: "muted",
  },
  {
    badge: "CREATE2",
    title: "Flexible Account Types",
    desc: "Works with standard EOAs and CREATE2 StealthWallet contracts. EIP-7702 is not yet supported on Polkadot Hub (pallet-revive). No wallet migration required.",
    href: "/docs/eip-7702",
    color: "muted",
  },
] as const;

export const metadata = docsMetadata("Overview — Privacy Protocol for Polkadot", "Dust Protocol provides stealth addresses (ERC-5564), ZK-UTXO privacy pools with FFLONK proofs, private token swaps, compliance screening, and gasless claims. Non-custodial privacy for Polkadot.", "/docs/overview");

export default function OverviewPage() {
  /* articleLd contains only hardcoded string literals from this file, escaped by safeJsonLd */
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleLd }} />
    <DocsPage
      currentHref="/docs/overview"
      title="Dust Protocol"
      subtitle="Private payments and private swaps on Polkadot Hub Testnet (chain 420420417). Funds dissolve into the blockchain — no on-chain link between sender and recipient. Native currency is PAS."
      badge="OVERVIEW"
    >
      {/* What it is */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">What is Dust?</h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-6">
          Dust Protocol is an on-chain privacy layer running exclusively on Polkadot Hub Testnet (chain 420420417).
          It uses pallet-revive (Polkadot&apos;s EVM-compatible smart contract engine) rather than a standard EVM.
          It lets users send, receive, and swap PAS and MockUSDC without creating a public ledger trail — the
          fundamental privacy problem that affects every public blockchain today.
        </p>

        <div className="mb-8">
          <PrivacyFlow />
        </div>

        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          When you receive PAS normally, the entire world can see your address balance, income history, and spending
          patterns. Dust eliminates this by routing all payments through{" "}
          <strong className="text-white">one-time stealth addresses</strong> — each payment lands at a fresh address
          that only the recipient can derive.
        </p>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          The <strong className="text-white">Privacy Pool</strong> and{" "}
          <strong className="text-white">Privacy Swaps</strong> layers go further: even the act of consolidating
          multiple stealth payments or swapping tokens leaves no traceable fingerprint, thanks to in-browser{" "}
          <strong className="text-white">zero-knowledge proofs</strong>.
        </p>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mt-4">
          <strong className="text-white">Dust V2</strong> introduces a ZK-UTXO model with arbitrary-amount deposits,
          FFLONK proofs (no trusted setup, but larger proving keys at ~223&ndash;283 MB cached via Cache API after
          first download), split withdrawals for denomination privacy, and a compliance framework (currently disabled
          for testnet with verifier = address(0)) — making it possible to prove legitimacy without sacrificing privacy.
        </p>
      </section>

      {/* Supported networks */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Supported Networks</h2>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono border border-[rgba(255,255,255,0.08)] rounded-sm text-[rgba(255,255,255,0.5)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E6007A]" />
            Polkadot Hub Testnet (420420417)
          </span>
        </div>
        <p className="text-xs text-[rgba(255,255,255,0.4)] mt-2">
          Uses pallet-revive (not standard EVM). Native currency: PAS. Tokens: MockUSDC (real USDC not yet available), WPAS (wrapped PAS for AMM compatibility).
        </p>
      </section>

      {/* Feature cards */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-4 uppercase">Core Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f) => (
            <Link
              key={f.href + f.title}
              href={f.href}
              className="group flex flex-col gap-2 p-4 border border-[rgba(255,255,255,0.06)] rounded-sm hover:border-[rgba(0,255,65,0.15)] hover:bg-[rgba(0,255,65,0.02)] transition-all"
            >
              <div className="flex items-center justify-between">
                <DocsBadge variant={f.color as never}>{f.badge}</DocsBadge>
              </div>
              <p className="text-[13px] font-mono font-semibold text-white group-hover:text-[#00FF41] transition-colors">
                {f.title}
              </p>
              <p className="text-xs text-[rgba(255,255,255,0.45)] leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick start */}
      <section>
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Quick Start</h2>
        <ol className="space-y-2 text-sm text-[rgba(255,255,255,0.6)] leading-relaxed list-none">
          {[
            "Connect your wallet and complete onboarding (takes ~1 minute).",
            "Register a .dust name — this is your private payment address.",
            "Share your /pay/yourname link. Anyone can send you PAS without knowing your real address.",
            "When payments arrive, claim them gas-free from your Activities page.",
            "Optionally deposit claimed funds to the Privacy Pool to consolidate without creating a traceable link.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-sm bg-[rgba(0,255,65,0.06)] border border-[rgba(0,255,65,0.15)] flex items-center justify-center text-[9px] font-mono text-[#00FF41] mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <Link
            href="/docs/how-it-works"
            className="inline-flex items-center gap-2 text-[12px] font-mono text-[#00FF41] hover:text-white transition-colors"
          >
            Read: How It Works →
          </Link>
        </div>
      </section>
    </DocsPage>
    </>
  );
}
