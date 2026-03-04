/**
 * x402 API Server — serves premium data behind a shielded payment wall.
 *
 * Flow:
 *   1. Agent requests GET /api/premium-data
 *   2. No X-PAYMENT header -> 402 with scheme:"shielded" requirement
 *   3. Valid X-PAYMENT header -> premium data response
 *
 * Usage:
 *   npx tsx examples/demo-server.ts
 */
import express from "express";
import {
  SCHEME_NAME,
  POOL_ADDRESSES,
  DEFAULT_ASSETS,
  TREE_DEPTH,
} from "../src/constants";

const app = express();
const PORT = 3000;
const NETWORK = "eip155:84532";
const PAY_TO = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
// 0.10 USDC (6 decimals)
const PRICE_BASE_UNITS = "100000";
const TREE_SERVICE_URL = "http://localhost:3001/tree";

interface ShieldedPaymentHeader {
  proof: string;
  publicSignals: Record<string, string>;
}

app.use((req, _res, next) => {
  const raw = req.headers["x-payment"];
  if (raw && typeof raw === "string") {
    try {
      const decoded = Buffer.from(raw, "base64").toString();
      (req as express.Request & { shieldedPayment?: ShieldedPaymentHeader }).shieldedPayment =
        JSON.parse(decoded);
    } catch {
      // Malformed payment header — treat as no payment
    }
  }
  next();
});

app.get("/api/premium-data", (req, res) => {
  const payment = (req as express.Request & { shieldedPayment?: ShieldedPaymentHeader })
    .shieldedPayment;

  if (!payment) {
    const asset = DEFAULT_ASSETS[NETWORK];
    const pool = POOL_ADDRESSES[NETWORK];

    res.status(402).json({
      x402Version: 2,
      error: "Payment required",
      resource: {
        url: "/api/premium-data",
        description: "Premium AI training data",
      },
      accepts: [
        {
          scheme: SCHEME_NAME,
          network: NETWORK,
          amount: PRICE_BASE_UNITS,
          asset: asset.address,
          payTo: PAY_TO,
          maxTimeoutSeconds: 300,
          extra: {
            dustPoolV2: pool,
            merkleRoot: "0",
            treeDepth: TREE_DEPTH,
            treeServiceUrl: TREE_SERVICE_URL,
            supportedAssets: [asset.address],
          },
        },
      ],
    });
    return;
  }

  const proofLen = payment.proof ? (payment.proof.length - 2) / 2 : 0;
  console.log(
    `Payment received! Proof: ${proofLen} bytes, nullifier: ${payment.publicSignals?.nullifier0?.slice(0, 20) ?? "?"}...`,
  );

  res.json({
    data: "Premium AI training dataset: Llama-3-tokenized corpus v4.2",
    records: 1_500_000,
    format: "parquet",
    timestamp: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`\n=== x402 API Server ===`);
  console.log(`Serving premium data at http://localhost:${PORT}/api/premium-data`);
  console.log(`Payment: 0.10 USDC (shielded via DustPoolV2 on Base Sepolia)`);
  console.log(`Pool: ${POOL_ADDRESSES[NETWORK]}`);
});
