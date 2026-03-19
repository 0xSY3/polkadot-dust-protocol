import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsBadge } from "@/components/docs/DocsBadge";
import {
  SwapFlowDiagramSnippet,
  SwapTokenPairSnippet,
  SwapDenomSnippet,
  SwapPriceInfoSnippet,
} from "@/components/docs/visuals/SwapFlowPreview";

export default function SwapsAppGuidePage() {
  return (
    <DocsPage
      currentHref="/docs/app-guide/swaps"
      title="Privacy Swaps"
      subtitle="Swap tokens privately through the DustPoolV2 ZK-UTXO pool. The relayer withdraws to its wallet, swaps via the PrivacyAMM, and re-deposits the output — using a two-transaction pattern."
      badge="APP GUIDE"
    >
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          How Privacy Swaps Work
        </h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          Privacy Swaps use a <strong className="text-white">two-transaction pattern</strong> executed by the
          relayer. Your browser generates an FFLONK proof (which takes 30&ndash;60 seconds) to withdraw
          from DustPoolV2 to the relayer&apos;s wallet. The relayer then wraps PAS to WPAS (Wrapped PAS)
          if needed, swaps on the PrivacyAMM pool, and deposits the output back into DustPoolV2 as a
          new UTXO note. The on-chain record never links your input to the swap output.
        </p>
        <SwapFlowDiagramSnippet />
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-4 uppercase">
          The Swap Flow
        </h2>
        <SwapTokenPairSnippet />
        <DocsStepList steps={[
          {
            title: "Select input and output tokens",
            children: <>Choose the token pair (e.g., PAS to USDC) and enter the amount you want to swap.
              Your shielded pool balance is shown next to the FROM field.</>,
          },
          {
            title: "Get quote from PrivacyAMM",
            children: <>The app fetches a real-time quote from the PrivacyAMM pool. The estimated
              output, exchange rate, and minimum received amount (after slippage and 2% relayer fee) are
              displayed in the price info panel.</>,
          },
          {
            title: "Generate FFLONK proof (30–60 seconds)",
            children: <>Your browser generates a zero-knowledge proof using the DustV2Transaction circuit.
              On first use, the proving key (~223MB) is downloaded and cached by the browser. The proof
              demonstrates ownership of valid UTXO notes without revealing which ones. The proof&apos;s{" "}
              <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 rounded-sm">recipient</code> is
              set to the relayer&apos;s wallet address.</>,
          },
          {
            title: "Relayer executes the two-tx swap",
            children: <>The proof and swap parameters are sent to the relayer, which executes the swap
              in multiple steps:{" "}
              <strong>(1)</strong> withdraws PAS from DustPoolV2 to the relayer wallet,{" "}
              <strong>(2)</strong> wraps PAS to WPAS (Wrapped PAS) for AMM compatibility,{" "}
              <strong>(3)</strong> swaps on the PrivacyAMM pool,{" "}
              <strong>(4)</strong> computes a Poseidon commitment and deposits the output back into
              DustPoolV2 as a new note.</>,
          },
          {
            title: "Output deposited as new UTXO note",
            children: <>The swap output arrives as a fresh shielded note in DustPoolV2. Your browser
              saves this note (encrypted in IndexedDB). You can withdraw, transfer, or swap it
              again — it is indistinguishable from any other note in the pool.</>,
          },
        ]} />
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          Denomination Privacy
        </h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-3">
          When enabled (default ON), the denomination privacy engine splits your swap amount into
          standard PAS denomination chunks (100,000 / 50,000 / 10,000 / 5,000 / 1,000 / 500 / 100 /
          50 / 10 / 5 / 1 PAS). Each chunk is swapped in a separate transaction with random timing
          delays between them. This prevents amount correlation — an observer cannot link your swap to
          a specific deposit by matching the exact amount.
        </p>
        <SwapDenomSnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          The app suggests nearby rounded amounts that require fewer chunks. Fewer chunks means a
          faster swap and less total gas.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          Price &amp; Slippage
        </h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-3">
          The reference price comes from the PrivacyAMM pool spot price (with Chainlink oracle as
          an alternative when available). Slippage tolerance is configurable: 0.1%, 0.5%, 1%, or a
          custom value up to 50%. If price impact exceeds 50%, the UI shows a red warning — this
          indicates low pool liquidity.
        </p>
        <SwapPriceInfoSnippet />
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          Relayer Fee
        </h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          A 2% fee is deducted from the swap output to cover gas costs and relayer operations. The
          minimum received amount shown in the price panel already accounts for both slippage tolerance
          and the relayer fee.
        </p>
      </section>

      <DocsCallout type="info" title="CHAIN AVAILABILITY">
        Swaps are available on Polkadot Hub Testnet (chain 420420417) alongside all pool operations
        (deposits, withdrawals, transfers). The AMM pool uses WPAS (Wrapped PAS) and USDC as the trading pair.
      </DocsCallout>

      <DocsCallout type="tip" title="FEWER CHUNKS = FASTER">
        Use the denomination suggestions to pick a nearby amount that requires fewer chunks. Fewer
        chunks means a faster swap and less total gas.
      </DocsCallout>

      <section className="mt-8">
        <div className="flex flex-wrap gap-2">
          <DocsBadge variant="green">FFLONK</DocsBadge>
          <DocsBadge variant="green">PrivacyAMM</DocsBadge>
          <DocsBadge variant="muted">Two-Tx Swap</DocsBadge>
          <DocsBadge variant="muted">WPAS</DocsBadge>
        </div>
      </section>
    </DocsPage>
  );
}
