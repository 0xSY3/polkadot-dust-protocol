import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsBadge } from "@/components/docs/DocsBadge";
import { docsMetadata } from "@/lib/seo/metadata";
import { techArticleJsonLd } from "@/lib/seo/jsonLd";

/*
 * XSS-safe: all values below are hardcoded string literals defined in this file.
 * safeJsonLd() in jsonLd.ts escapes '<' as \u003c. No user input flows into this data.
 */
const articleLd = techArticleJsonLd("Privacy Swaps — Private Token Exchange via Sequential Transaction Pattern on Polkadot Hub", "Swap PAS and MockUSDC privately. The relayer withdraws from DustPoolV2 via FFLONK proof, swaps via PrivacyAMM, and re-deposits the output — using a multi-step transaction pattern required by pallet-revive call depth limits.", "/docs/privacy-swaps");

export const metadata = docsMetadata("Privacy Swaps — Private Token Exchange via Sequential Transaction Pattern on Polkadot Hub", "Swap PAS and MockUSDC privately. The relayer withdraws from DustPoolV2 via FFLONK proof, swaps via PrivacyAMM, and re-deposits the output — using a multi-step transaction pattern required by pallet-revive call depth limits.", "/docs/privacy-swaps");

export default function PrivacySwapsPage() {
  return (
    <>
    {/* Safe: hardcoded string literals only — see articleLd declaration above */}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleLd }} />
    <DocsPage
      currentHref="/docs/privacy-swaps"
      title="Privacy Swaps"
      subtitle="Swap PAS and MockUSDC privately on Polkadot Hub Testnet. The relayer withdraws from DustPoolV2 via FFLONK proof, swaps via PrivacyAMM (WPAS/MockUSDC pool), and re-deposits the output as a new UTXO note — using a multi-step transaction pattern required by pallet-revive call depth limits."
      badge="CORE FEATURE"
    >

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">DEX Fingerprinting</h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          Even after privately receiving PAS through stealth transfers, swapping reveals a pattern. The amount
          you send to a DEX and the timing form a unique fingerprint. An on-chain analyst can cluster
          multiple stealth wallets as belonging to the same user just by watching who swaps similar amounts
          at similar times.
        </p>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          Privacy Swaps on Polkadot Hub use a <strong>multi-step transaction pattern</strong> instead of an atomic adapter
          contract. Due to pallet-revive&apos;s call depth limits, the original single-tx adapter approach doesn&apos;t work.
          Instead, the relayer first withdraws from DustPoolV2 (proving UTXO ownership via FFLONK proof) to
          its own wallet, then executes a swap via PrivacyAMM (WPAS/MockUSDC pool) and re-deposits the swap output
          back into DustPoolV2 as a new UTXO note. The on-chain record never links a specific depositor to a specific
          swap output. Native PAS must be wrapped to WPAS for AMM compatibility.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-4 uppercase">How Privacy Swaps Work</h2>

        <DocsStepList steps={[
          {
            title: "Prove ownership of UTXO notes in DustPoolV2",
            children: <>Your browser generates a <strong>FFLONK proof</strong> using the standard DustV2Transaction
              circuit (~12,400 constraints). The proof demonstrates you own valid notes in the pool without revealing
              which ones. Public signals: <code>merkleRoot, null0, null1, outC0, outC1, pubAmount, pubAsset,
              recipient, chainId</code>. The <code>recipient</code> is set to the <strong>relayer wallet</strong>
              address — not an adapter contract, because pallet-revive&apos;s call depth limits prevent nested contract
              calls deep enough for atomic withdraw-swap-deposit.</>,
          },
          {
            title: "Choose swap parameters",
            children: <>Select the token pair (PAS to MockUSDC or MockUSDC to PAS), the amount to swap, and a minimum
              output amount for slippage protection (default 1% slippage). You can swap <strong>any arbitrary
              amount</strong>. The swap routes through PrivacyAMM on Polkadot Hub, using the WPAS/MockUSDC pool.
              Native PAS is automatically wrapped to WPAS before swapping.</>,
          },
          {
            title: "Submit to relayer",
            children: <>The proof and swap parameters are sent to the relayer (same-origin Next.js API at{" "}
              <code>/api/v2/swap</code>). The relayer validates the proof format, verifies the chain ID matches,
              confirms the proof recipient is the relayer wallet, and checks nullifier freshness.</>,
          },
          {
            title: "Sequential execution: withdraw \u2192 swap + re-deposit",
            children: <>The relayer executes two separate transactions:
              <strong> (1)</strong> calls <code>DustPoolV2.withdraw()</code> with the FFLONK proof to release PAS
              to the relayer wallet. <strong>(2)</strong> The relayer wraps PAS to WPAS (if needed), swaps on
              PrivacyAMM, computes a Poseidon commitment for the swap output, and deposits it back into
              DustPoolV2. This multi-step pattern is necessary because pallet-revive cannot handle the nested call depth
              that the original single-tx adapter approach required.</>,
          },
          {
            title: "Receive new UTXO note",
            children: <>The swap output is a fresh UTXO note in DustPoolV2 with a new Poseidon commitment. Your
              browser stores this note (encrypted with AES-256-GCM in IndexedDB). You can later withdraw, transfer,
              or swap this note again — it is indistinguishable from any other note in the pool.</>,
          },
        ]} />
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-4 uppercase">Architecture</h2>
        <div className="font-mono text-xs leading-relaxed text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-sm p-5 overflow-x-auto whitespace-pre">
          {`User browser
  \u2514\u2500 generates FFLONK proof \u2500\u2500\u25BA Relayer (/api/v2/swap)
       (9 public signals:            \u2514\u2500 validates proof + chainId
        merkleRoot, null0,           \u2514\u2500 verifies recipient = relayer wallet
        null1, outC0, outC1,
        pubAmount, pubAsset,         TX 1: DustPoolV2.withdraw(proof)
        recipient=relayer,                 \u2514\u2500 verifies FFLONK proof
        chainId)                           \u2514\u2500 marks nullifiers spent
                                           \u2514\u2500 releases PAS to relayer wallet

                                     TX 2: Swap + re-deposit
                                           \u251C\u2500 wrap PAS \u2192 WPAS (if native)
                                           \u251C\u2500 PrivacyAMM.vanillaSwap()
                                           \u2502     \u2514\u2500 WPAS/MockUSDC pool
                                           \u2502     \u2514\u2500 market rate swap
                                           \u2514\u2500 DustPoolV2.deposit(newCommitment)
                                                 \u2514\u2500 Poseidon commitment for output
                                                 \u2514\u2500 new UTXO note in pool

  Multi-step pattern required by pallet-revive call depth limit`}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-4 uppercase">V2 vs V1 Architecture</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="text-left py-2 pr-6 text-[rgba(255,255,255,0.3)] font-normal tracking-wider uppercase text-[10px]">Property</th>
                <th className="text-left py-2 pr-6 text-[rgba(255,255,255,0.3)] font-normal tracking-wider uppercase text-[10px]">V1</th>
                <th className="text-left py-2 text-[rgba(255,255,255,0.3)] font-normal tracking-wider uppercase text-[10px]">V2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {[
                ["Swap amounts", "Fixed denominations only", "Arbitrary amounts"],
                ["Pool type", "Custom DustSwapPool contracts", "PrivacyAMM on Polkadot Hub (WPAS/MockUSDC)"],
                ["Hook", "DustSwapHook (beforeSwap/afterSwap)", "No hooks \u2014 multi-step pattern via relayer"],
                ["Proof system", "Groth16 (PrivateSwap.circom)", "FFLONK (reuses DustV2Transaction)"],
                ["Deposit step", "Separate deposit into DustSwapPool", "Uses existing DustPoolV2 notes"],
                ["Output", "Tokens to stealth address", "New UTXO note in DustPoolV2"],
                ["Execution", "Single tx via adapter contract", "Multi-step: withdraw to relayer, then swap+deposit (pallet-revive depth limit)"],
                ["Wait period", "50-block minimum wait", "None required"],
                ["Tokens", "ETH/USDC on Ethereum", "PAS/MockUSDC on Polkadot Hub Testnet"],
              ].map(([k, v1, v2]) => (
                <tr key={k} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="py-2.5 pr-6 text-[rgba(255,255,255,0.5)]">{k}</td>
                  <td className="py-2.5 pr-6 text-[rgba(255,255,255,0.35)]">{v1}</td>
                  <td className="py-2.5 text-white">{v2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-4 uppercase">Key Properties</h2>
        <div className="space-y-3">
          {[
            {
              label: "Arbitrary amounts",
              desc: "No fixed denominations. Swap any amount from your DustPoolV2 notes. The UTXO model handles change automatically via the 2-in-2-out circuit.",
            },
            {
              label: "Sequential transaction execution",
              desc: "Withdraw and swap happen in sequential transactions due to pallet-revive call depth limits. The relayer wallet is a trusted intermediary during the swap window.",
            },
            {
              label: "PrivacyAMM on Polkadot Hub",
              desc: "Swaps execute via PrivacyAMM using the WPAS/MockUSDC pool. Native PAS is wrapped to WPAS (ERC-20) for AMM compatibility. Real USDC is not yet available on Polkadot Hub Testnet.",
            },
            {
              label: "Reuses DustV2Transaction circuit",
              desc: "No separate swap-specific circuit. The relayer reuses the same FFLONK proof from DustPoolV2 withdrawals, reducing proving complexity and audit surface.",
            },
            {
              label: "Output stays in the pool",
              desc: "Swap output is re-deposited as a new UTXO note in DustPoolV2 by the relayer.",
            },
            {
              label: "Slippage protection",
              desc: "The relayer enforces a minimum output amount (minAmountOut, default 1% slippage). If the PrivacyAMM swap returns less than this threshold, the swap transaction reverts.",
            },
            {
              label: "Chain ID binding",
              desc: "The chain ID (420420417) is a public signal in the FFLONK proof. A proof generated on one chain cannot be replayed on any other chain.",
            },
            {
              label: "Relayer-based submission",
              desc: "A same-origin relayer submits both transactions, paying gas on behalf of the user. The default relayer fee is 200 bps (2%), with an enforced maximum of 500 bps (5%), validated before submission.",
            },
          ].map(({ label, desc }) => (
            <div key={label} className="flex gap-4 p-3 border border-[rgba(255,255,255,0.05)] rounded-sm">
              <div className="shrink-0 w-1 rounded-full bg-[rgba(0,255,65,0.3)]" />
              <div>
                <p className="text-xs font-mono font-semibold text-white mb-1">{label}</p>
                <p className="text-xs text-[rgba(255,255,255,0.5)] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DocsCallout type="warning" title="UTXO notes are local">
        Your deposit notes are encrypted and stored in IndexedDB. If you clear browser data or switch devices,
        you lose the ability to generate withdrawal proofs. Export and back up your notes from the Settings page.
      </DocsCallout>

      <DocsCallout type="info" title="Gas cost">
        A privacy swap costs gas across two separate transactions: the DustPoolV2 withdrawal (~220,000 gas for FFLONK
        verification) and the swap + re-deposit via PrivacyAMM. Total gas varies but is typically 400,000&ndash;700,000
        gas across both transactions. The relayer pays gas on behalf of the user.
      </DocsCallout>

      <section className="mt-8">
        <div className="flex flex-wrap gap-2">
          <DocsBadge variant="green">FFLONK</DocsBadge>
          <DocsBadge variant="green">DustV2Transaction</DocsBadge>
          <DocsBadge variant="green">PrivacyAMM</DocsBadge>
          <DocsBadge variant="muted">BN254</DocsBadge>
          <DocsBadge variant="muted">Multi-Step Pattern</DocsBadge>
          <DocsBadge variant="muted">Arbitrary Amounts</DocsBadge>
          <DocsBadge variant="amber">Chain ID Binding</DocsBadge>
          <DocsBadge variant="amber">Slippage Protection</DocsBadge>
        </div>
      </section>
    </DocsPage>
    </>
  );
}
