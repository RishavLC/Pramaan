import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { HAS_HELIUS, PROGRAM_ID, shorten, solscanAccount } from "../lib/config";

const DEMO = [
  "Connect Phantom (devnet).",
  "Agency A: enter the credential text and click Issue Credential.",
  "Show the signature and Solscan link.",
  "Click “Verify as Agency B →” and verify. Result: Valid.",
  "Back at Agency A, click Revoke Credential.",
  "Verify again. Result: Invalid. Credential revoked.",
];

export default function StatusPanel({ go }: { go: (t: "issuer" | "verifier") => void }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [live, setLive] = useState<"checking" | "yes" | "no" | "error">("checking");

  useEffect(() => {
    let off = false;
    setLive("checking");
    connection
      .getAccountInfo(PROGRAM_ID)
      .then((i) => !off && setLive(i?.executable ? "yes" : "no"))
      .catch(() => !off && setLive("error"));
    return () => { off = true; };
  }, [connection]);

  useEffect(() => {
    let off = false;
    setBalance(null);
    if (wallet)
      connection.getBalance(wallet.publicKey).then((l) => !off && setBalance(l / LAMPORTS_PER_SOL)).catch(() => {});
    return () => { off = true; };
  }, [connection, wallet]);

  return (
    <>
      {live === "no" && (
        <div className="notice bad-note">
          The TrustBridge program is not on devnet yet, so Issue and Verify are disabled until it is deployed
          (run <code>./scripts/deploy-devnet.sh</code>).
        </div>
      )}
      {live === "error" && <div className="notice bad-note">Cannot reach the RPC. Check your Helius key.</div>}

      <section className="hero">
        <h2>Verify a citizen’s credential without calling the issuing agency</h2>
        <p>
          Agency A anchors a hash of the credential on Solana. Agency B reads it directly from the chain,
          so verification works even when Agency A’s systems are offline.
        </p>
        <div className="actions">
          <button className="cta" onClick={() => go("issuer")}>Agency A · Issue a credential</button>
          <button className="ghost" onClick={() => go("verifier")}>Agency B · Verify a credential</button>
        </div>
      </section>

      <div className="stats">
        <div className="stat"><span>Network</span><b>Solana devnet</b><small>{HAS_HELIUS ? "via Helius RPC" : "public RPC"}</small></div>
        <div className="stat">
          <span>Program</span>
          <b className={live === "yes" ? "ok" : live === "checking" ? "" : "bad"}>
            {live === "yes" ? "Live" : live === "checking" ? "Checking…" : "Not deployed"}
          </b>
          <small><a href={solscanAccount(PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer">{shorten(PROGRAM_ID.toBase58(), 6)}</a></small>
        </div>
        <div className="stat"><span>Wallet</span><b>{wallet ? shorten(wallet.publicKey.toBase58(), 5) : "Not connected"}</b><small>Phantom</small></div>
        <div className="stat"><span>Balance</span><b>{wallet ? (balance === null ? "…" : `${balance.toFixed(3)} SOL`) : "—"}</b><small>devnet</small></div>
      </div>

      <section className="card">
        <h2>How it works</h2>
        <div className="flow">
          <div className="fstep"><i>1</i><b>Agency A issues</b><p>The credential text is hashed in the browser. Only the hash goes on-chain. No personal data.</p></div>
          <div className="arrow">→</div>
          <div className="fstep"><i>2</i><b>Solana records it</b><p>A program account stores the hash, the issuer’s key and a valid/revoked flag.</p></div>
          <div className="arrow">→</div>
          <div className="fstep"><i>3</i><b>Agency B verifies</b><p>Reads the record directly and checks the issuer. Agency A is never contacted.</p></div>
        </div>
      </section>

      <section className="card">
        <h2>Demo script</h2>
        <ol className="steps">{DEMO.map((s) => <li key={s}>{s}</li>)}</ol>
      </section>
    </>
  );
}
