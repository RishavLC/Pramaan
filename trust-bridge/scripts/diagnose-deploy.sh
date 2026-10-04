#!/usr/bin/env bash
# READ-ONLY. Prints only versions, paths and PUBLIC keys. Never reads secret key contents.
# Run from anywhere:  ./scripts/diagnose-deploy.sh   (saves diagnose-report.txt)
cd "$(dirname "$0")/.." || exit 1
exec > >(tee diagnose-report.txt) 2>&1
SO=target/deploy/trust_bridge.so
KP=target/deploy/trust_bridge-keypair.json
hr() { printf '\n==== %s ====\n' "$1"; }

hr "1. WALLET: which Anchor.toml does anchor read, and what does it say?"
echo "cwd: $PWD"
d=$PWD; while [ "$d" != "/" ]; do [ -f "$d/Anchor.toml" ] && echo "Anchor.toml found: $d/Anchor.toml"; d=$(dirname "$d"); done
grep -nE '^(cluster|wallet)' Anchor.toml
echo "ANCHOR_WALLET env       : ${ANCHOR_WALLET:-<unset>}"
echo "ANCHOR_PROVIDER_URL env : ${ANCHOR_PROVIDER_URL:-<unset>}"
solana config get 2>&1 | grep -E 'Config File|RPC URL|Keypair Path'
W=$(grep -E '^wallet' Anchor.toml | sed 's/.*= *"\(.*\)"/\1/'); W="${W/#\~/$HOME}"
[ -f "$W" ] && echo "Anchor.toml wallet pubkey: $(solana-keygen pubkey "$W")" || echo "!! wallet file in Anchor.toml does not exist: $W"
echo "Expected deployer pubkey : DJYFvzQrHk2pyRQot5D8a9mARkJop2AhPZFm4F3xRnHx"

hr "2. PROGRAM ID consistency"
EXPECTED=DGspiMoU2zGPjW1ahv3P8gdz6p4S2jBwEkN5GKAdK1K
echo "declare_id!   : $(grep -oE 'declare_id!\("[^"]+' programs/trust_bridge/src/lib.rs | sed 's/.*"//')"
grep -nE '^trust_bridge' Anchor.toml
[ -f "$KP" ] && echo "keypair file  : $(solana-keygen pubkey $KP)" || echo "!! $KP missing"
[ -f target/idl/trust_bridge.json ] && echo "IDL address   : $(grep -m1 '"address"' target/idl/trust_bridge.json)"
echo "expected      : $EXPECTED"
echo "stale ids in project:"; grep -rnE 'GeMiAf5naVeLTMVc15XVT5cje8SkbRaMPBXe6Jy8VMEB|7q3jwWUepGWzgZuBVTcNffprQJtUGAw9KvjqrvwJNHjk' . --exclude-dir=node_modules --exclude-dir=target --exclude=diagnose-report.txt || echo "  none"

hr "3. TOOLCHAIN: what actually compiles the program?"
echo "solana CLI       : $(solana --version 2>&1)"
echo "anchor CLI       : $(anchor --version 2>&1)"
echo "which -a (first one wins):"
for t in solana anchor cargo-build-sbf cargo-build-bpf; do which -a $t 2>/dev/null | sed "s/^/  $t -> /"; done
echo "cargo build-sbf  :"; cargo build-sbf --version 2>&1 | sed 's/^/  /'
echo "rustc            : $(rustc --version 2>&1)   (RUSTUP_TOOLCHAIN=${RUSTUP_TOOLCHAIN:-unset})"
echo "RUSTFLAGS        : ${RUSTFLAGS:-<unset>}"
echo "platform-tools cached under ~/.cache/solana:"; ls ~/.cache/solana 2>/dev/null | sed 's/^/  /'
echo "cargo config files (can inject linker/rustflags):"
ls .cargo/config* ~/.cargo/config* 2>/dev/null | sed 's/^/  /' || true
if [ -f Cargo.lock ]; then
  echo "locked crates in Cargo.lock:"
  for c in anchor-lang solana-program; do
    awk -v c="$c" '$0=="name = \""c"\""{getline; print "  " c " " $0}' Cargo.lock
  done
else echo "no Cargo.lock yet (run anchor build first)"; fi

hr "4. THE .so: is it a Solana v0 program built from current source?"
if [ -f "$SO" ]; then
  ls -l --time-style=full-iso "$SO" programs/trust_bridge/src/lib.rs | awk '{print "  "$6" "$7"  "$5" bytes  "$9}'
  [ "$SO" -ot programs/trust_bridge/src/lib.rs ] && echo "!! .so is OLDER than lib.rs -> stale artifact"
  file "$SO"
  echo "-- ELF header (Flags = SBPF version: 0x0 is the v0 format a 2.1.0 CLI expects)"
  readelf -h "$SO" | grep -E 'Type|Machine|Flags|Number of section'
  echo "-- program headers (a v0 Solana .so has a DYNAMIC segment):"
  readelf -l "$SO" | grep -E 'LOAD|DYNAMIC' || echo "  (none)"
  echo "-- sections:"; readelf -S "$SO" | grep -E '^\s+\[' | awk '{print "  "$2" "$3}' | head -30
  echo "-- dynamic section present? "; readelf -d "$SO" 2>&1 | head -3
  FL=$(readelf -h "$SO" | awk '/Flags/{print $2}')
  [ "$FL" != "0x0" ] && echo "!! Flags=$FL: NOT SBPF v0. Built by a newer toolchain / --arch flag than CLI 2.1.0 understands."
else echo "!! $SO not found. Run anchor build."; fi

hr "5. VERDICT HINTS"
SOLV=$(solana --version 2>/dev/null | awk '{print $2}')
SBFDIR=$(dirname "$(which cargo-build-sbf 2>/dev/null)"); SOLDIR=$(dirname "$(which solana 2>/dev/null)")
[ "$SBFDIR" != "$SOLDIR" ] && echo "!! cargo-build-sbf ($SBFDIR) is NOT from the same install as solana ($SOLDIR): the build and the deploy use different toolchains."
SP=$(awk '$0=="name = \"solana-program\""{getline; gsub(/[^0-9.]/,"",$0); print; exit}' Cargo.lock 2>/dev/null)
[ -n "$SP" ] && echo "solana-program locked at $SP while CLI is $SOLV"
echo "Report saved to $PWD/diagnose-report.txt (contains no secrets)."
