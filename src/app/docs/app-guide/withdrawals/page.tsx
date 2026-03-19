import { DocsPage } from "@/components/docs/DocsPage";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsStepList } from "@/components/docs/DocsStepList";
import { DocsBadge } from "@/components/docs/DocsBadge";
import {
  WithdrawBalanceSnippet,
  WithdrawNoteSelectionSnippet,
  WithdrawDenomSnippet,
  WithdrawCooldownSnippet,
} from "@/components/docs/visuals/WithdrawFlowPreview";

export default function WithdrawalsPage() {
  return (
    <DocsPage
      currentHref="/docs/app-guide/withdrawals"
      title="Withdrawals"
      badge="APP GUIDE"
    >

      {/* Shielded Balance */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          Shielded Balance
        </h2>
        <WithdrawBalanceSnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          Your shielded balance is the sum of all unspent UTXO notes held in DustPool V2. Each note
          is an encrypted commitment that only your spending key can unlock. The balance updates
          automatically as you deposit, withdraw, or receive transfers.
        </p>
      </section>

      {/* How Withdrawal Works */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          How Withdrawal Works
        </h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          Withdrawing from DustPool V2 consumes one or two of your shielded UTXO notes and produces an FFLONK
          zero-knowledge proof that you own them &mdash; without revealing which notes are yours. The proof is
          submitted to the relayer, which verifies it on-chain and transfers funds to your chosen recipient address.
        </p>
        <DocsStepList steps={[
          {
            title: "Select input notes",
            children: <>The app finds the smallest unspent note that covers your withdrawal amount.
              Any excess is returned as a new <strong>change note</strong> &mdash; similar to Bitcoin&apos;s UTXO model.</>,
          },
          {
            title: "Generate FFLONK proof in-browser (30–60 seconds)",
            children: <>Your browser runs the 2-in-2-out transaction circuit via snarkjs + WASM. On first use,
              the proving key (~223MB) is downloaded and cached by the browser. Subsequent proofs skip the
              download but still take 30&ndash;60 seconds to generate. No trusted setup is required.</>,
          },
          {
            title: "Submit proof to relayer",
            children: <>The proof and public signals are sent to the same-origin relayer at <code>/api/v2/withdraw</code>.
              The relayer submits the proof to <code>DustPoolV2.withdraw()</code> on-chain. Compliance
              screening is currently disabled on Polkadot Hub Testnet.</>,
          },
          {
            title: "On-chain verification and transfer",
            children: <>The contract verifies the FFLONK proof, checks nullifier freshness, validates chain ID binding,
              confirms pool solvency, marks nullifiers as spent, and transfers PAS to the recipient.</>,
          },
        ]} />
      </section>

      {/* Note Selection */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          Note Selection
        </h2>
        <WithdrawNoteSelectionSnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          The app automatically selects the smallest unspent note whose value is greater than or equal to the
          withdrawal amount. If the note is larger than the requested amount, the difference is returned as a
          new shielded change note that appears in your balance immediately.
        </p>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          Pending notes (deposits still awaiting Merkle tree inclusion) are excluded from selection. Only
          confirmed notes with a valid leaf index are eligible.
        </p>
      </section>

      {/* The 2-in-2-out Circuit */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          The 2-in-2-out Circuit
        </h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          The transaction circuit consumes up to 2 input notes and produces up to 2 output notes (withdrawal + change).
          It enforces balance conservation: the sum of inputs equals the sum of outputs plus the public withdrawal amount.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="text-left py-2 pr-6 text-[rgba(255,255,255,0.3)] font-normal tracking-wider uppercase text-[10px]">Property</th>
                <th className="text-left py-2 text-[rgba(255,255,255,0.3)] font-normal tracking-wider uppercase text-[10px]">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {[
                ["Constraints", "~12,400"],
                ["Proof system", "FFLONK (no trusted setup)"],
                ["Proving time", "~30\u201360 seconds (in-browser)"],
                ["Public signals (9)", "merkleRoot, null0, null1, outC0, outC1, pubAmount, pubAsset, recipient, chainId"],
                ["Verification gas", "~220,000"],
              ].map(([k, v]) => (
                <tr key={k} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="py-2.5 pr-6 text-[rgba(255,255,255,0.5)]">{k}</td>
                  <td className="py-2.5 text-white">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          The chain ID is included as the 9th public signal to prevent cross-chain proof replay. A proof
          generated on one chain cannot be submitted on another.
        </p>
      </section>

      {/* Denomination Privacy */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          Denomination Privacy
        </h2>
        <WithdrawDenomSnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          Withdrawing an unusual amount (e.g. 1,337 PAS) creates a unique fingerprint that can be correlated
          with deposits. The <strong className="text-white">split circuit</strong> (2-in-8-out, ~32,074 constraints,
          15 public signals) automatically decomposes your withdrawal into standard denomination chunks
          (max 7 chunks per split, with the 8th output reserved for change). Each chunk is submitted as a
          separate transaction with randomized timing delays, making each one indistinguishable
          from other withdrawals of the same denomination.
        </p>

        <p className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.45)] font-mono mb-2">
          PAS Denomination Table
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {["100,000", "50,000", "10,000", "5,000", "1,000", "500", "100", "50", "10", "5", "1"].map((d) => (
            <span
              key={d}
              className="px-2 py-0.5 rounded-sm bg-[rgba(0,255,65,0.06)] border border-[rgba(0,255,65,0.12)] text-[10px] font-mono text-[#00FF41]"
            >
              {d} PAS
            </span>
          ))}
        </div>

        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          For example, withdrawing 15 PAS splits into two chunks: 10 + 5 PAS. The relayer
          submits each chunk with a random delay between them, so an observer sees two standard-denomination
          withdrawals with no obvious timing pattern.
        </p>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
          If the number of chunks is high, the UI suggests nearby round amounts that decompose into fewer
          chunks &mdash; fewer on-chain transactions means less opportunity for correlation.
        </p>
      </section>

      {/* Compliance Cooldown */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          Compliance Cooldown
        </h2>
        <WithdrawCooldownSnippet />
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          Compliance screening is <strong className="text-white">currently disabled</strong> on Polkadot Hub
          Testnet. The compliance verifier contract is not deployed, so there is no cooldown period and
          withdrawals can be sent to any address immediately after Merkle tree inclusion.
        </p>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          When enabled on mainnet, deposits exceeding $10,000 USD will trigger a 1-hour cooldown during which
          withdrawals are restricted to the original depositor&apos;s address, giving compliance systems time
          to screen the deposit.
        </p>
        <DocsCallout type="info" title="Testnet Note">
          On the current testnet deployment, all withdrawals proceed without compliance checks. This behavior
          will change when the compliance verifier is deployed for mainnet.
        </DocsCallout>
      </section>

      {/* Recipient Address */}
      <section className="mb-10">
        <h2 className="text-sm font-mono font-semibold text-white tracking-wider mb-3 uppercase">
          Recipient Address
        </h2>
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed mb-4">
          The recipient defaults to your currently connected wallet address. For maximum privacy, use a
          fresh address that has no on-chain history linking it to your identity. The ZK proof hides
          which notes you spent, but if the recipient address is already associated with you, the privacy
          benefit is reduced.
        </p>
      </section>

      {/* Tip callout */}
      <DocsCallout type="tip" title="Fewer Chunks">
        Use the &ldquo;Fewer chunks&rdquo; suggestions shown below the denomination split preview to minimize
        the number of split transactions. Fewer chunks means fewer on-chain events to correlate.
      </DocsCallout>

      {/* Badges */}
      <div className="mt-6 flex flex-wrap gap-2">
        <DocsBadge variant="green">FFLONK</DocsBadge>
        <DocsBadge variant="green">Split Circuit</DocsBadge>
        <DocsBadge variant="green">Denomination Privacy</DocsBadge>
        <DocsBadge variant="muted">Polkadot Hub</DocsBadge>
      </div>
    </DocsPage>
  );
}
