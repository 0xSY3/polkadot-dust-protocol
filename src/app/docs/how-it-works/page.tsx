import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsBadge } from "@/components/docs/DocsBadge";
import { EndToEndTimeline } from "@/components/docs/visuals/EndToEndTimeline";
import { docsMetadata } from "@/lib/seo/metadata";
import { howToJsonLd } from "@/lib/seo/jsonLd";

// XSS-safe: all values are hardcoded string literals; safeJsonLd escapes < as \u003c
const howToData = howToJsonLd(
  "How to Send Private Crypto Payments with Dust Protocol",
  "Complete walkthrough: connect wallet, set PIN, register .dust name, receive stealth payments, claim gas-free, consolidate via privacy pool, and swap tokens anonymously.",
  [
    { name: "Connect your wallet", text: "Connect with any EVM wallet (MetaMask, WalletConnect, or Coinbase Wallet). The wallet is used only to sign a message." },
    { name: "Set a PIN", text: "Choose a numeric PIN. Dust derives your private stealth keys using PBKDF2(wallet_signature + PIN, salt, 100,000 iterations). Neither alone is sufficient." },
    { name: "Register a .dust name", text: "Your stealth meta-address (spendKey + viewKey) is registered on the StealthNameRegistry contract under a name like alice.dust." },
    { name: "Receive a stealth payment", text: "The sender looks up your .dust name, derives a one-time stealth address via ECDH, and sends PAS directly to it." },
    { name: "Claim gas-free via sponsor relay", text: "Click Claim. Your stealth key signs an EIP-712 message locally. A sponsor relayer deploys a StealthWallet at the CREATE2 stealth address and drains it atomically." },
    { name: "Consolidate in Privacy Pool V2", text: "Deposit any amount of PAS to DustPoolV2 with a Poseidon UTXO commitment. Withdraw with a FFLONK proof to break the on-chain link. Use split withdrawals for denomination privacy." },
    { name: "Swap tokens privately", text: "Withdraw from DustPoolV2 with a FFLONK proof to the relayer wallet, then the relayer swaps via PrivacyAMM and deposits the output back into DustPoolV2. Two separate transactions due to pallet-revive call depth limits." },
    { name: "Compliance & disclosure", text: "Compliance verifier is disabled for testnet (verifier = address(0)). 1-hour deposit cooldown is active. Generate voluntary disclosure reports using view keys for tax or audit purposes — without revealing spending authority." },
  ],
);

export const metadata = docsMetadata("How Dust Protocol Works — Private Payments End to End", "Complete walkthrough of the Dust Protocol V2 lifecycle from wallet connection and PIN setup to stealth transfers, ZK-UTXO privacy pool deposits with FFLONK proofs, compliance screening, and private swaps.", "/docs/how-it-works");

export default function HowItWorksPage() {
  return (
    <>
    {/* XSS-safe: howToData is built from hardcoded string literals in this file; safeJsonLd escapes < as \u003c */}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToData }} />
    <DocsPage
      currentHref="/docs/how-it-works"
      title="How It Works"
      subtitle="A complete walkthrough of the Dust Protocol lifecycle — from wallet connection to private withdrawal."
      badge="GETTING STARTED"
    >

      <DocsCallout type="info" title="One-pager summary">
        This page covers the full system end-to-end. Individual feature pages go deeper on each step.
      </DocsCallout>

      <div className="mb-12">
        <EndToEndTimeline />
      </div>

      {/* Phase 1 */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-1 uppercase">Phase 1 — Identity Setup</h2>
        <p className="text-xs text-[rgba(255,255,255,0.35)] font-mono mb-5">One-time, done during onboarding</p>
        <DocsStepList steps={[
          {
            title: "Connect your wallet",
            children: <>Connect with any EVM wallet (MetaMask, WalletConnect, Coinbase Wallet, etc.).
              The wallet is used only to <strong>sign a message</strong> — not to hold privacy funds directly.</>,
          },
          {
            title: "Set a PIN",
            children: <>You choose a numeric PIN. Dust derives your private stealth keys using{" "}
              <code>PBKDF2(wallet_signature + PIN, salt, 100 000 iterations)</code>. The PIN never leaves your browser.
              Neither the wallet signature nor the PIN alone are sufficient — both are required.</>,
          },
          {
            title: "Register a .dust name",
            children: <>Your <strong>stealth meta-address</strong> (a pair of secp256k1 public keys: <code>spendKey</code> and <code>viewKey</code>)
              is registered on the <code>StealthNameRegistry</code> contract under a name like <code>alice.dust</code>.
              This is what senders look up. It contains no balance information and maps to no single address.</>,
          },
        ]} />
      </section>

      {/* Phase 2 */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-1 uppercase">Phase 2 — Receiving a Payment</h2>
        <p className="text-xs text-[rgba(255,255,255,0.35)] font-mono mb-5">Sender-side, no interaction from recipient needed</p>
        <DocsStepList steps={[
          {
            title: "Sender looks up alice.dust",
            children: <>The sender visits <code>/pay/alice</code> (or uses any UI that queries <code>StealthNameRegistry</code>).
              The contract returns Alice's meta-address: her two public keys.</>,
          },
          {
            title: "Stealth address is derived (ECDH)",
            children: <>The sender picks a random scalar <code>r</code>, computes a <strong>shared secret</strong> via
              Elliptic Curve Diffie–Hellman: <code>sharedSecret = r × viewKey</code>. A fresh one-time
              <strong> stealth address</strong> is derived: <code>stealthAddress = spendKey + hash(sharedSecret) × G</code>.
              This address is unique every time — the same sender paying Alice twice produces two completely different addresses.</>,
          },
          {
            title: "PAS is sent to the stealth address",
            children: <>The sender broadcasts a normal PAS transfer to <code>stealthAddress</code>.
              Simultaneously, an announcement <code>(ephemeralPubKey R, stealthAddress)</code> is emitted on the
              <code> ERC5564Announcer</code> contract — it's the encrypted hint Alice's scanner uses.</>,
          },
        ]} />
      </section>

      {/* Phase 3 */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-1 uppercase">Phase 3 — Detecting & Claiming</h2>
        <p className="text-xs text-[rgba(255,255,255,0.35)] font-mono mb-5">Recipient-side, runs automatically in the browser</p>
        <DocsStepList steps={[
          {
            title: "Scanner polls announcements",
            children: <>Every 30 seconds, the in-browser scanner fetches new announcements from <code>ERC5564Announcer</code>.
              For each announcement it recomputes <code>sharedSecret = viewKey × R</code> and checks whether the
              derived address matches the announced <code>stealthAddress</code>.</>,
          },
          {
            title: "Stealth private key is derived",
            children: <>When a match is found, Alice derives the stealth private key:
              <code> stealthPrivKey = spendKey + hash(sharedSecret)</code>. This key controls the funds.
              It never leaves the browser — it is computed in memory and used only to sign.</>,
          },
          {
            title: "Gasless claim via sponsor relay",
            children: <>Alice clicks Claim. The stealth key signs an <strong>EIP-712 message</strong> locally.
              A sponsor relayer submits it to the <code>StealthWalletFactory</code> contract, which deploys a
              <code> StealthWallet</code> at the CREATE2 stealth address and immediately drains its balance to
              Alice&apos;s designated claim address — all in one atomic transaction. Gas is paid by the sponsor relayer.</>,
          },
        ]} />
      </section>

      {/* Phase 4 */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-1 uppercase">Phase 4 — Consolidation (Privacy Pool)</h2>
        <p className="text-xs text-[rgba(255,255,255,0.35)] font-mono mb-5">Optional — breaks the fan-in correlation</p>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-5">
          If you receive 10 stealth payments and claim all of them to the same address, an on-chain observer can
          see 10 claim transactions landing at one wallet. <strong>DustPool V2</strong> breaks this link with a
          ZK-UTXO model — deposit any amount, withdraw with a FFLONK proof, optionally split into common
          denominations to prevent amount fingerprinting.
        </p>
        <DocsStepList steps={[
          {
            title: "Deposit any amount to DustPoolV2",
            children: <>Deposit PAS or ERC-20 tokens in <strong>any amount</strong> — no fixed denominations required.
              Your browser computes a Poseidon commitment <code>C = Poseidon(ownerPubKey, amount, asset, chainId, blinding)</code>
              and a nullifier <code>N = Poseidon(nullifierKey, commitment, leafIndex)</code>. The commitment is inserted into a
              relayer-maintained off-chain Merkle tree (depth 20).</>,
          },
          {
            title: "Generate a FFLONK ZK proof (in-browser)",
            children: <>When withdrawing, the browser generates a <strong>FFLONK</strong> proof (no trusted setup required)
              using the 2-in-2-out transaction circuit (~26,900 constraints). Public inputs include:
              <code> merkleRoot, nullifier0, nullifier1, outCommitment0, outCommitment1, pubAmount, pubAsset, recipient, chainId</code>.
              For denomination privacy, use the <strong>2-in-8-out split circuit</strong> (~32,074 constraints) to break
              withdrawals into common denomination chunks automatically.</>,
          },
          {
            title: "Relayer verifies and executes",
            children: <>The proof is submitted to a relayer (same-origin Next.js API) which verifies the FFLONK proof on-chain
              via <code>DustPoolV2.withdraw()</code>. The contract checks: (1) Merkle root validity, (2) nullifier freshness,
              (3) chainId binding, (4) FFLONK proof verification, (5) solvency. Funds are sent to your chosen recipient.
              For split withdrawals, <code>withdrawSplit()</code> processes up to 8 output notes in one transaction.</>,
          },
        ]} />
      </section>

      {/* Phase 4.5 */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-1 uppercase">Compliance Layer</h2>
        <p className="text-xs text-[rgba(255,255,255,0.35)] font-mono mb-5">Built-in accountability without sacrificing privacy</p>
        <DocsStepList steps={[
          {
            title: "Deposit screening (disabled for testnet)",
            children: <>The compliance verifier is set to <code>address(0)</code> on Polkadot Hub Testnet, meaning
              deposit screening is currently disabled. The contract supports a Chainalysis-style compliance oracle
              that can be enabled for mainnet — if the depositor&apos;s address is flagged, the transaction reverts
              with <code>DepositBlocked()</code>.</>,
          },
          {
            title: "1-hour cooldown period",
            children: <>After depositing, a 1-hour cooldown enforces that withdrawals can only go to the original
              depositor's address. After the cooldown expires, funds can be withdrawn to any address. This gives
              compliance systems time to flag suspicious deposits.</>,
          },
          {
            title: "Voluntary disclosure via view keys",
            children: <>Users can derive a <strong>view key</strong> from their stealth keys and generate a
              self-authenticating disclosure report. The report lists all notes (deposits, transfers, withdrawals)
              with amounts and Poseidon commitment verification — without revealing spending keys. Useful for
              tax reporting, audits, or regulatory compliance.</>,
          },
        ]} />
      </section>

      {/* Phase 5 */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-1 uppercase">Phase 5 — Private Swaps</h2>
        <p className="text-xs text-[rgba(255,255,255,0.35)] font-mono mb-5">Optional — swap tokens without a traceable on-chain signature</p>
        <DocsStepList steps={[
          {
            title: "Generate a FFLONK proof for withdrawal",
            children: <>The browser generates a FFLONK proof against your DustPoolV2 UTXO notes — the same
              2-in-2-out transaction circuit used for regular withdrawals. The proof targets the
              <strong> relayer wallet</strong> as the recipient (not an adapter contract). This is the two-tx swap
              pattern required by pallet-revive&apos;s call depth limits on Polkadot Hub.</>,
          },
          {
            title: "Two-tx swap: withdraw then swap via PrivacyAMM",
            children: <>The relayer executes the swap in two separate transactions: <strong>(1)</strong> withdraws
              from <code>DustPoolV2</code> using your FFLONK proof, sending funds to the relayer wallet.
              <strong> (2)</strong> The relayer swaps on PrivacyAMM (WPAS/MockUSDC pool) and deposits the output
              tokens back into <code>DustPoolV2</code> with an on-chain Poseidon commitment. The two-tx pattern
              replaces the adapter contract approach because pallet-revive cannot handle the nested call depth.</>,
          },
          {
            title: "Receive new UTXO notes",
            children: <>After the swap completes, you hold new DustPoolV2 UTXO notes denominated in the output token.
              The swap leaves no traceable link between input and output — the relayer wallet is the only
              visible on-chain intermediary. Your new notes can be withdrawn or used in further transfers normally.</>,
          },
        ]} />
      </section>

      {/* Summary table */}
      <section>
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-4 uppercase">Standards Used</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="text-left py-2 pr-6 text-[rgba(255,255,255,0.3)] font-normal tracking-wider uppercase text-[10px]">Standard</th>
                <th className="text-left py-2 text-[rgba(255,255,255,0.3)] font-normal tracking-wider uppercase text-[10px]">Role in Dust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {[
                ["ERC-5564", "Stealth address announcement standard"],
                ["ERC-6538", "Stealth meta-address registry"],
                ["Sponsor Relay", "Gasless stealth claims via EIP-712 signed StealthWallet deploy+drain"],
                ["FFLONK", "ZK proof system for DustPool V2 \u2014 no trusted setup, proving keys ~223\u2013283 MB cached via Cache API"],
                ["Poseidon hash", "ZK-friendly hash in commitments and Merkle trees"],
                ["PrivacyAMM", "Liquidity pools for private swaps (WPAS/MockUSDC) via two-tx pattern"],
                ["pallet-revive", "Polkadot Hub\u2019s EVM-compatible contract engine (affects receipt handling and call depth)"],
                ["View Keys", "Selective disclosure for compliance and auditing"],
              ].map(([std, role]) => (
                <tr key={std} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="py-2.5 pr-6 text-[#00FF41]">{std}</td>
                  <td className="py-2.5 text-[rgba(255,255,255,0.55)]">{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DocsPage>
    </>
  );
}
