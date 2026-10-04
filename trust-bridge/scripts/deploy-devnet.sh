#!/usr/bin/env bash
# Deploys TrustBridge to Solana devnet through Helius RPC.
# Usage: ./scripts/deploy-devnet.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then set -a; . ./.env; set +a; fi
: "${HELIUS_API_KEY:?Set HELIUS_API_KEY in .env (see .env.example)}"
WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"
WALLET="${WALLET/#\~/$HOME}"
RPC="https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}"

command -v anchor >/dev/null || { echo "anchor CLI not found"; exit 1; }
command -v solana >/dev/null || { echo "solana CLI not found"; exit 1; }
[ -f "$WALLET" ] || { echo "Wallet not found at $WALLET (run: solana-keygen new)"; exit 1; }

PUBKEY=$(solana-keygen pubkey "$WALLET")
echo "==> Deployer: $PUBKEY"

echo "==> Syncing program ID with target/deploy keypair"
anchor keys sync

echo "==> Building"
anchor build

# Deploy needs roughly 2-3 SOL for this program.
BAL=$(solana balance "$PUBKEY" --url "$RPC" | awk '{print $1}')
echo "==> Balance: $BAL SOL"
if awk "BEGIN{exit !($BAL < 3)}"; then
  echo "==> Low balance, requesting airdrop from public devnet faucet"
  solana airdrop 2 "$PUBKEY" --url https://api.devnet.solana.com || \
    echo "    Airdrop failed (rate limited?). Use https://faucet.solana.com and re-run."
fi

echo "==> Deploying to devnet"
anchor deploy --provider.cluster "$RPC" --provider.wallet "$WALLET"

PID=$(solana-keygen pubkey target/deploy/trust_bridge-keypair.json)

echo "==> Publishing IDL (optional, lets explorers decode accounts)"
anchor idl init "$PID" --filepath target/idl/trust_bridge.json \
  --provider.cluster "$RPC" --provider.wallet "$WALLET" 2>/dev/null || \
anchor idl upgrade "$PID" --filepath target/idl/trust_bridge.json \
  --provider.cluster "$RPC" --provider.wallet "$WALLET" || \
  echo "    IDL publish skipped (not required for the frontend)."

echo
solana program show "$PID" --url "$RPC"
echo
echo "Program ID : $PID"
echo "Solscan    : https://solscan.io/account/${PID}?cluster=devnet"
echo "Next       : npm run smoke:devnet"
