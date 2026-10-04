#!/usr/bin/env bash
# One safe path to Devnet: explicit wallet, explicit program keypair, preflight checks, fresh build.
set -euo pipefail
cd "$(dirname "$0")/.."

WALLET="${DEPLOY_WALLET:-/home/rishav/.config/solana/trustbridge-devnet.json}"
EXPECTED_ID="DGspiMoU2zGPjW1ahv3P8gdz6p4S2jBwEkN5GKAdK1K"
EXPECTED_PAYER="DJYFvzQrHk2pyRQot5D8a9mARkJop2AhPZFm4F3xRnHx"
KP=target/deploy/trust_bridge-keypair.json
SO=target/deploy/trust_bridge.so
RPC="devnet"
if [ -f .env ]; then set -a; . ./.env; set +a; fi
[ -n "${HELIUS_API_KEY:-}" ] && [ "$HELIUS_API_KEY" != "YOUR_KEY" ] && RPC="https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}"
fail() { echo "STOP: $*" >&2; exit 1; }

echo "==> Preflight"
[ -f "$WALLET" ] || fail "wallet not found: $WALLET"
PAYER=$(solana-keygen pubkey "$WALLET")
[ "$PAYER" = "$EXPECTED_PAYER" ] || fail "wallet pubkey is $PAYER, expected $EXPECTED_PAYER"
[ -f "$KP" ] || fail "$KP missing. Do NOT generate a new one; restore the DGspi... keypair."
KPID=$(solana-keygen pubkey "$KP")
DECL=$(grep -oE 'declare_id!\("[^"]+' programs/trust_bridge/src/lib.rs | sed 's/.*"//')
TOML=$(grep -E '^trust_bridge' Anchor.toml | sed 's/.*"\(.*\)"/\1/' | sort -u)
echo "    deployer wallet : $PAYER"
echo "    program keypair : $KPID"
echo "    declare_id!     : $DECL"
echo "    Anchor.toml     : $TOML"
[ "$KPID" = "$EXPECTED_ID" ] && [ "$DECL" = "$EXPECTED_ID" ] && [ "$TOML" = "$EXPECTED_ID" ] \
  || fail "program ID mismatch (all four must equal $EXPECTED_ID)"

SOLDIR=$(dirname "$(which solana)"); SBFDIR=$(dirname "$(which cargo-build-sbf)")
[ "$SOLDIR" = "$SBFDIR" ] || fail "cargo-build-sbf ($SBFDIR) and solana ($SOLDIR) come from different installs. Put $SOLDIR first in PATH."

echo "==> Fresh build (keeps your program keypair)"
rm -f "$SO"
rm -rf target/sbpf-solana-solana target/sbf-solana-solana target/release
anchor build

echo "==> Check the .so is SBPF v0 (what CLI 2.1.0 can deploy)"
FL=$(readelf -h "$SO" | awk '/Flags/{print $2}')
[ "$FL" = "0x0" ] || fail "ELF Flags=$FL (not v0). Run ./scripts/diagnose-deploy.sh and share diagnose-report.txt"
ls -l "$SO"

echo "==> Balance"
solana balance "$PAYER" --url "$RPC"

echo "==> Deploy"
anchor deploy --provider.cluster "$RPC" --provider.wallet "$WALLET" \
  --program-name trust_bridge --program-keypair "$KP"

echo "==> Verify on-chain"
solana program show "$EXPECTED_ID" --url "$RPC"
echo "Solscan: https://solscan.io/account/${EXPECTED_ID}?cluster=devnet"
