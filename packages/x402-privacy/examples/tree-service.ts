/**
 * Standalone Merkle tree service for @x402/privacy.
 *
 * Indexes DepositQueued events from DustPoolV2 on Base Sepolia,
 * builds an in-memory Poseidon Merkle tree, and serves proofs
 * over HTTP via Express.
 *
 * Usage:
 *   npx tsx examples/tree-service.ts
 *
 * Environment:
 *   BASE_SEPOLIA_RPC  — RPC endpoint (default: https://sepolia.base.org)
 *   TREE_PORT         — HTTP port (default: 3001)
 *   POLL_INTERVAL     — Sync interval in ms (default: 15000)
 */
import express from "express";
import { TreeIndexer } from "../src/tree/indexer";

const PORT = parseInt(process.env.TREE_PORT ?? "3001", 10);
const RPC_URL = process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const POOL_ADDRESS = "0x17f52f01ffcB6d3C376b2b789314808981cebb16" as const;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL ?? "15000", 10);

async function main(): Promise<void> {
  console.log("Starting tree service...");
  console.log(`  Pool: ${POOL_ADDRESS}`);
  console.log(`  RPC:  ${RPC_URL}`);
  console.log(`  Port: ${PORT}`);

  const indexer = new TreeIndexer({
    rpcUrl: RPC_URL,
    poolAddress: POOL_ADDRESS,
    startBlock: 0n,
  });

  console.log("Initializing indexer (syncing events)...");
  await indexer.initialize();
  console.log(`Synced! Root: ${indexer.root}, Leaves: ${indexer.leafCount}`);

  const app = express();

  app.get("/tree/root", async (_req, res) => {
    res.json({
      root: indexer.root.toString(),
      leafCount: indexer.leafCount,
    });
  });

  app.get("/tree/path/:leafIndex", async (req, res) => {
    const leafIndex = parseInt(req.params.leafIndex, 10);
    if (isNaN(leafIndex) || leafIndex < 0) {
      res.status(400).json({ error: "Invalid leaf index" });
      return;
    }
    try {
      const proof = await indexer.getProof(leafIndex);
      res.json({
        root: proof.root.toString(),
        pathElements: proof.pathElements.map(String),
        pathIndices: proof.pathIndices,
        leafIndex,
      });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.get("/tree/commitment/:hash", async (req, res) => {
    const leafIndex = indexer.lookupCommitment(req.params.hash);
    res.json({
      exists: leafIndex !== undefined,
      leafIndex,
    });
  });

  app.get("/health", async (_req, res) => {
    res.json({
      status: "ok",
      root: indexer.root.toString(),
      leafCount: indexer.leafCount,
      initialized: indexer.isInitialized(),
    });
  });

  setInterval(async () => {
    try {
      const prevCount = indexer.leafCount;
      await indexer.sync();
      const newCount = indexer.leafCount;
      if (newCount > prevCount) {
        console.log(`Synced: ${newCount - prevCount} new leaves (total: ${newCount})`);
      }
    } catch (err) {
      console.error("Sync error:", (err as Error).message);
    }
  }, POLL_INTERVAL_MS);

  app.listen(PORT, () => {
    console.log(`\nTree service running on http://localhost:${PORT}`);
    console.log(`  GET /tree/root           - current Merkle root + leaf count`);
    console.log(`  GET /tree/path/:index    - Merkle proof for leaf`);
    console.log(`  GET /tree/commitment/:h  - check if commitment exists`);
    console.log(`  GET /health              - service health`);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
