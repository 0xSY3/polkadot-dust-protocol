#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
PIDS=()

cleanup() {
  echo ""
  echo "Cleaning up..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "Done."
}

trap cleanup EXIT INT TERM

cd "$PACKAGE_DIR"

echo "=== @x402/privacy Demo ==="
echo ""
echo "This demo runs 3 services + 1 AI agent:"
echo "  1. Tree service   (port 3001) — Merkle tree indexer"
echo "  2. Facilitator    (port 3002) — proof verification + settlement"
echo "  3. API server     (port 3000) — premium data behind 402 paywall"
echo "  4. AI agent       — generates ZK proof, pays privately"
echo ""

# Check for zkey file
ZKEY_PATH="$PACKAGE_DIR/../../../../contracts/dustpool/circuits/v2/build/DustV2Transaction.zkey"
if [ ! -f "$ZKEY_PATH" ]; then
  echo "WARNING: ZKey file not found at $ZKEY_PATH"
  echo "The agent proof generation will fail without it."
  echo ""
fi

echo "Starting services..."
echo ""

echo "[1/3] Tree service (port 3001)..."
npx tsx examples/tree-service.ts &
PIDS+=($!)

echo "[2/3] Facilitator (port 3002)..."
npx tsx examples/demo-facilitator.ts &
PIDS+=($!)

echo "[3/3] API server (port 3000)..."
npx tsx examples/demo-server.ts &
PIDS+=($!)

echo ""
echo "Waiting for services to initialize..."
sleep 3

# Health-check the tree service before proceeding
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 5 ]; then
    echo "WARNING: Tree service did not respond after 5 attempts."
  fi
  sleep 1
done

echo ""
echo "=== Running AI Agent ==="
echo ""

npx tsx examples/demo-agent.ts

echo ""
echo "Demo complete."
