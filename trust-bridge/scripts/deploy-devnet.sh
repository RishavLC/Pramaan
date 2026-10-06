#!/usr/bin/env bash
# One safe path to Devnet. Stops BEFORE deploying if anything is inconsistent.
set -euo pipefail
cd "$(dirname "$0")/.."

WALLET="${DEPLOY_WALLET:-/home/rishav/.config/solana/trustbridge-devnet.json}"
EXPECTED_ID="${EXPECTED_ID:-DGspiMoU2zGPjW1ahv3P8gdz6p4S2jBwEkN5GKAdK1K}"
EXPECTED_PAYER="${EXPECTED_PAYER:-DJYFvzQrHk2pyRQot5D8a9mARkJop2AhPZFm4F3xRnHx}"
OTHER_KP="${OTHER_KP:-/home/rishav/trust-bridge/target/deploy/trust_bridge-keypair.json}"
TOOLS="${TOOLS_VERSION:-v1.57}"          # the only platform-tools cached on this machine
KP=target/deploy/trust_bridge-keypair.json
SO=target/deploy/trust_bridge.so
RPC="devnet"
if [ -f .env ]; then set -a; . ./.env; set +a; fi
[ -n "${HELIUS_API_KEY:-}" ] && [ "$HELIUS_API_KEY" != "YOUR_KEY" ] && RPC="https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}"

fail() { echo; echo "STOP: $*" >&2; exit 1; }
elf_flags() { readelf -h "$1" | awk '/Flags/{gsub(",","",$2); print $2}'; }

echo "==> 1. Wallet"
[ -f "$WALLET" ] || fail "wallet not found: $WALLET"
PAYER=$(solana-keygen pubkey "$WALLET")
[ "$PAYER" = "$EXPECTED_PAYER" ] || fail "wallet pubkey is $PAYER, expected $EXPECTED_PAYER"
echo "    deployer: $PAYER"

echo "==> 2. Program keypair"
mkdir -p target/deploy
KPID=none; [ -f "$KP" ] && KPID=$(solana-keygen pubkey "$KP")
if [ "$KPID" != "$EXPECTED_ID" ]; then
  echo "    keypair in this folder is $KPID, expected $EXPECTED_ID"
  if [ -f "$OTHER_KP" ] && [ "$(solana-keygen pubkey "$OTHER_KP")" = "$EXPECTED_ID" ]; then
    [ -f "$KP" ] && cp "$KP" "$KP.bak-$KPID"
    cp "$OTHER_KP" "$KP"
    KPID=$EXPECTED_ID
    echo "    restored the $EXPECTED_ID keypair from your other copy (old one kept as $KP.bak-*)"
  elif [ "${ADOPT_KEYPAIR_ID:-0}" = "1" ] && [ "$KPID" != none ]; then
    sed -i "s/$EXPECTED_ID/$KPID/g" Anchor.toml programs/trust_bridge/src/lib.rs app/src/idl/trust_bridge.json
    EXPECTED_ID=$KPID
    echo "    ADOPT_KEYPAIR_ID=1: project switched to $KPID everywhere"
  else
    fail "no keypair for $EXPECTED_ID found at $OTHER_KP.
      Either copy it to $KP, or re-run with ADOPT_KEYPAIR_ID=1 to use the keypair already here ($KPID)."
  fi
fi
DECL=$(grep -oE 'declare_id!\("[^"]+' programs/trust_bridge/src/lib.rs | sed 's/.*"//')
TOML=$(grep -E '^trust_bridge' Anchor.toml | sed 's/.*"\(.*\)"/\1/' | sort -u)
echo "    keypair=$KPID declare_id=$DECL Anchor.toml=$TOML"
[ "$KPID" = "$EXPECTED_ID" ] && [ "$DECL" = "$EXPECTED_ID" ] && [ "$TOML" = "$EXPECTED_ID" ] || fail "program ID mismatch"

echo "==> 3. Toolchain"
[ "$(dirname "$(which solana)")" = "$(dirname "$(which cargo-build-sbf)")" ] || fail "solana and cargo-build-sbf come from different installs"
[ -d "$HOME/.cache/solana/$TOOLS" ] || echo "    note: platform-tools $TOOLS not cached; it will be downloaded"

echo "==> 4. Fresh build (deletes the stale SBPF-v3 .so; keeps the keypair)"
rm -f "$SO"
rm -rf target/sbpf-solana-solana target/sbf-solana-solana target/release
anchor build -- --tools-version "$TOOLS"

echo "==> 5. Gate: is the .so the format CLI 2.1.0 can deploy?"
[ -f "$SO" ] || fail "build produced no $SO"
FL=$(elf_flags "$SO")
file "$SO"; echo "    ELF Flags = $FL (need 0x0)"
[ "$FL" = "0x0" ] || fail "still not SBPF v0 (Flags=$FL). Nothing was deployed. Send me the output above."

echo "==> 6. Deploy to $RPC"
solana balance "$PAYER" --url "$RPC"
anchor deploy --provider.cluster "$RPC" --provider.wallet "$WALLET" \
  --program-name trust_bridge --program-keypair "$KP"

echo "==> 7. Verify on-chain"
solana program show "$EXPECTED_ID" --url "$RPC"
echo "Solscan: https://solscan.io/account/${EXPECTED_ID}?cluster=devnet"
