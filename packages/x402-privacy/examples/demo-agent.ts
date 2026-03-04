/**
 * AI Agent — makes a private API payment using the x402 shielded scheme.
 *
 * Flow:
 *   1. Request premium data -> get 402 with scheme:"shielded"
 *   2. Select shielded option, generate FFLONK ZK proof (~66s on CPU)
 *   3. Send proof to facilitator for on-chain verification
 *   4. Retry API call with X-PAYMENT header -> get premium data
 *   5. Server never learns the payer's identity
 *
 * Prerequisites:
 *   - demo-server.ts running on port 3000
 *   - demo-facilitator.ts running on port 3002
 *   - tree-service.ts running on port 3001
 *
 * Usage:
 *   npx tsx examples/demo-agent.ts
 */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ShieldedEvmClientScheme } from "../src/client/scheme";
import { computeAssetId, computeOwnerPubKey, computeNoteCommitment } from "../src/crypto";
import type { NoteCommitmentV2 } from "../src/crypto";
import type { ShieldedPayload } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = "http://localhost:3000/api/premium-data";
const FACILITATOR_URL = "http://localhost:3002";

// Base Sepolia USDC
const CHAIN_ID = 84532;
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main(): Promise<void> {
  console.log("=== AI Agent: Private API Payment ===\n");

  // In production these are derived from wallet signature + PIN via deriveV2Keys()
  const spendingKey = 42n;
  const nullifierKey = 99n;

  const client = new ShieldedEvmClientScheme({
    spendingKey,
    nullifierKey,
    treeServiceUrl: "http://localhost:3001/tree",
    wasmPath: resolve(__dirname, "../circuits/DustV2Transaction.wasm"),
    zkeyPath: resolve(
      __dirname,
      "../../../../contracts/dustpool/circuits/v2/build/DustV2Transaction.zkey",
    ),
  });

  // Pre-load a UTXO (in production this comes from a DustPoolV2 deposit)
  const owner = await computeOwnerPubKey(spendingKey);
  const asset = await computeAssetId(CHAIN_ID, USDC_ADDRESS);
  const note = {
    owner,
    amount: 10_000_000n, // 10 USDC
    asset,
    chainId: CHAIN_ID,
    blinding: 12345n,
  };
  const commitment = await computeNoteCommitment(note);

  const preloadedNote: NoteCommitmentV2 = {
    note,
    commitment,
    leafIndex: 0,
    spent: false,
  };

  client.loadUtxos([preloadedNote]);

  const balanceUsdc = Number(client.getBalance(asset)) / 1e6;
  console.log(`Shielded balance: ${client.getBalance(asset)} base units (${balanceUsdc} USDC)\n`);

  // --- Step 1: Request premium data ---
  console.log("1. Requesting premium data...");
  const response = await fetch(API_URL);

  if (response.status !== 402) {
    console.log(`   Unexpected response: ${response.status}`);
    return;
  }

  console.log("   Got 402 Payment Required");
  const paymentRequired = await response.json();

  // --- Step 2: Find shielded payment option ---
  const shieldedOption = paymentRequired.accepts.find(
    (a: { scheme: string }) => a.scheme === "shielded",
  );

  if (!shieldedOption) {
    console.log("   No shielded payment option available");
    return;
  }

  const priceUsdc = Number(shieldedOption.amount) / 1e6;
  console.log(`   Price: ${shieldedOption.amount} base units (${priceUsdc} USDC)`);
  console.log(`   Pay to: ${shieldedOption.payTo}`);
  console.log(`   Pool: ${shieldedOption.extra.dustPoolV2}`);

  // --- Step 3: Generate ZK proof ---
  console.log("\n2. Generating FFLONK proof (this takes ~60 seconds on CPU)...");
  const startTime = Date.now();

  const paymentResult = await client.createPaymentPayload(2, shieldedOption);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   Proof generated in ${elapsed}s`);

  const payload = paymentResult.payload as unknown as ShieldedPayload;
  const proofBytes = (payload.proof.length - 2) / 2;
  console.log(`   Proof size: ${proofBytes} bytes`);
  console.log(`   Nullifier: ${payload.publicSignals.nullifier0.slice(0, 20)}...`);

  // --- Step 4: Verify with facilitator ---
  console.log("\n3. Verifying payment with facilitator...");
  const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proof: payload.proof,
      publicSignals: payload.publicSignals,
      amount: shieldedOption.amount,
      network: shieldedOption.network,
      payTo: shieldedOption.payTo,
    }),
  });
  const verifyResult = await verifyRes.json();

  if (verifyResult.isValid) {
    console.log("   Verification: VALID");
  } else {
    console.log(`   Verification: INVALID - ${verifyResult.invalidReason}`);
    console.log("   (This is expected with demo keys / empty on-chain tree)");
  }

  // --- Step 5: Retry API call with payment header ---
  console.log("\n4. Retrying API call with X-PAYMENT header...");
  const paymentHeader = Buffer.from(JSON.stringify(payload)).toString("base64");
  const paidResponse = await fetch(API_URL, {
    headers: { "X-PAYMENT": paymentHeader },
  });

  if (paidResponse.ok) {
    const data = await paidResponse.json();
    console.log("   SUCCESS! Premium data received:");
    console.log(`   ${JSON.stringify(data, null, 2)}`);
  } else {
    console.log(`   Failed: ${paidResponse.status}`);
  }

  console.log("\n=== Payment complete. Server never knew who paid. ===");
}

main().catch(console.error);
