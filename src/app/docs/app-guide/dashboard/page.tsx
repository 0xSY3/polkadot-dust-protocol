import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsBadge } from "@/components/docs/DocsBadge";
import {
  DashboardBalanceSnippet,
  DashboardPoolSnippet,
  DashboardActivitySnippet,
  DashboardLinkSnippet,
} from "@/components/docs/visuals/DashboardPreview";
import { docsMetadata } from "@/lib/seo/metadata";

export const metadata = docsMetadata(
  "Dashboard — Stealth Wallet Command Center",
  "View balances, manage privacy pool notes, track activity, and share your payment link — all from one screen.",
  "/docs/app-guide/dashboard",
);

export default function DashboardGuidePage() {
  return (
    <DocsPage
      currentHref="/docs/app-guide/dashboard"
      title="Dashboard"
      subtitle="Your command center — view balances, pool activity, and recent transactions at a glance."
      badge="APP GUIDE"
    >
      {/* Unified Balance */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Unified Balance</h2>
        <DashboardBalanceSnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          The top card aggregates your total PAS holdings across all sources into a single number. It sums
          two categories:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            ["Stealth", "Unclaimed payments sitting in stealth addresses that only you can detect via ECDH scanning."],
            ["Claimed", "Payments already claimed to one of your wallets (CREATE2 or ERC-4337)."],
          ].map(([label, desc]) => (
            <li key={label} className="flex gap-3 text-sm text-[rgba(255,255,255,0.6)]">
              <span className="shrink-0 text-[#00FF41] mt-0.5">—</span>
              <span><strong className="text-white">{label}</strong> — {desc}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          When unclaimed payments exist, an amber badge appears at the bottom of the card showing the count.
          Tap the refresh icon to re-scan the chain for new payments.
        </p>
      </section>

      {/* V2 Privacy Pool */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Privacy Pool (V2)</h2>
        <DashboardPoolSnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          The V2 pool card shows your shielded balance — PAS stored as ZK-UTXO notes inside the DustPoolV2
          contract. Each note is an encrypted commitment in your browser&apos;s IndexedDB, decryptable only with
          your spending key.
        </p>
        <ul className="space-y-2 mb-4">
          {[
            ["Balance", "Sum of all unspent notes (decrypted locally from IndexedDB)."],
            ["Note count", "Number of live UTXO notes — e.g. \"4 notes\"."],
            ["Action buttons", "DEPOSIT adds PAS into the pool, WITHDRAW removes it (auto-split into common denominations for privacy), TRANSFER sends a private in-pool transfer to another user."],
          ].map(([label, desc]) => (
            <li key={label} className="flex gap-3 text-sm text-[rgba(255,255,255,0.6)]">
              <span className="shrink-0 text-[#00FF41] mt-0.5">—</span>
              <span><strong className="text-white">{label}</strong> — {desc}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          If your V2 keys are not yet derived (no PIN entered this session), the card shows a PIN prompt.
          Enter your 6-digit PIN to derive spending and nullifier keys via PBKDF2 combined with a wallet signature.
        </p>
      </section>

      {/* Network Info */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Network</h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          The dashboard operates on <strong className="text-white">Polkadot Hub Testnet</strong> (chain 420420417).
          All balances are denominated in <strong className="text-white">PAS</strong> (the native currency). The
          privacy pool also supports USDC deposits and swaps between PAS and USDC via a PrivacyAMM pool.
        </p>
      </section>

      {/* Recent Activity */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Recent Activity</h2>
        <DashboardActivitySnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          A feed of your latest transactions across both incoming stealth payments and outgoing sends.
          Filter between <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 rounded-sm">all</code>,{" "}
          <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 rounded-sm">incoming</code>, and{" "}
          <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 rounded-sm">outgoing</code>.
        </p>
        <ul className="space-y-2">
          {[
            "Incoming payments show amount, sender (truncated address), block number, and claimed/unclaimed status.",
            "Outgoing payments show amount, recipient (truncated address), date, and completion status.",
            "Click any row to open the transaction on the block explorer.",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-[rgba(255,255,255,0.6)]">
              <span className="shrink-0 text-[#00FF41] mt-0.5">—</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Personal Link */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">Personal Link</h2>
        <DashboardLinkSnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          Displays your <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 rounded-sm">.dust</code> username
          and payment URL. Share this link with anyone — they can send you PAS without needing a Dust account.
          The card provides:
        </p>
        <ul className="space-y-2">
          {[
            "Your .dust name (e.g. alice.dust) with the pay path (/pay/alice)",
            "Copy Link — copies the full URL to your clipboard",
            "QR code — generates a scannable QR code for mobile payments",
            "External link — opens your pay page in a new tab",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-[rgba(255,255,255,0.6)]">
              <span className="shrink-0 text-[#00FF41] mt-0.5">—</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <DocsCallout type="tip" title="Auto-refresh">
        Balances refresh automatically every 30 seconds when your stealth keys are active. The background
        scanner picks up new payments without manual intervention. You can also tap the refresh icon on the
        balance card to trigger an immediate rescan.
      </DocsCallout>

      <div className="mt-8 flex flex-wrap gap-2">
        <DocsBadge variant="green">V2 UTXO</DocsBadge>
        <DocsBadge variant="green">FFLONK</DocsBadge>
        <DocsBadge variant="muted">ERC-5564</DocsBadge>
        <DocsBadge variant="muted">IndexedDB</DocsBadge>
        <DocsBadge variant="blue">Auto-scan</DocsBadge>
      </div>
    </DocsPage>
  );
}
