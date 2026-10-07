import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { NETWORK_NAME, PROGRAM_ID, PROGRAM_ID_MISMATCH, RPC_LABEL, shorten, solscanAccount, solscanTx } from "../lib/config";
import { timeAgo, useActivity } from "../lib/useActivity";

type Live = "checking" | "yes" | "no" | "error";
const WINDOW = 25;

function useProgramStatus(): Live {
  const { connection } = useConnection();
  const [live, setLive] = useState<Live>("checking");
  useEffect(() => {
    let off = false;
    setLive("checking");
    connection
      .getAccountInfo(PROGRAM_ID)
      .then((i) => !off && setLive(i?.executable ? "yes" : "no"))
      .catch(() => !off && setLive("error"));
    return () => { off = true; };
  }, [connection]);
  return live;
}

export default function Dashboard({ go, refreshKey }: { go: (path: string) => void; refreshKey: number }) {
  const { publicKey, connected } = useWallet();
  const live = useProgramStatus();
  const { rows, loading, error } = useActivity(WINDOW, refreshKey);

  const issued = rows.filter((r) => r.ok && r.kind === "issue").length;
  const revoked = rows.filter((r) => r.ok && r.kind === "revoke").length;
  const recent = rows.filter((r) => r.kind !== "other").slice(0, 5);
  const programId = PROGRAM_ID.toBase58();
  const num = (n: number) => (loading && rows.length === 0 ? "…" : error ? "—" : String(n));

  const statusText = live === "yes" ? "Operational" : live === "checking" ? "Checking…" : live === "no" ? "Not deployed" : "RPC unreachable";
  const statusClass = live === "yes" ? "ok" : live === "checking" ? "" : "bad";

  return (
    <>
      {live === "no" && (
        <div className="notice bad-note">
          The TrustBridge program is not on devnet yet, so Issue and Verify will fail until it is deployed
          (run <code>./scripts/deploy-devnet.sh</code>).
        </div>
      )}
      {live === "error" && <div className="notice bad-note">Cannot reach the RPC. Check <code>VITE_SOLANA_RPC_URL</code> or your Helius key.</div>}
      {PROGRAM_ID_MISMATCH && (
        <div className="notice bad-note">
          <code>VITE_PROGRAM_ID</code> does not match the program ID in the IDL. The app uses the IDL value; run <code>npm run sync-idl</code>.
        </div>
      )}

      <section className="hero">
        <div className="tags"><span className="tag">Demo Environment</span><span className="tag">{NETWORK_NAME}</span><span className="tag">Prototype</span></div>
        <h2>Digital Trust Infrastructure</h2>
        <p>
          A shared verification layer that enables government agencies to issue and verify trusted digital
          credentials without exchanging personal data between systems.
        </p>
        <div className={`status-line ${statusClass}`}>
          <span className={`dot ${live === "yes" ? "ok-dot" : live === "checking" ? "idle-dot" : "bad-dot"}`} aria-hidden />
          {live === "yes" ? "TrustBridge Network Operational (devnet program reachable)" : `TrustBridge Network: ${statusText}`}
        </div>
      </section>

      <section className="metrics" aria-label="Key metrics">
        <div className="metric"><span>Credentials Issued</span><b>{num(issued)}</b><small>From last {WINDOW} program transactions</small></div>
        <div className="metric"><span>Credentials Revoked</span><b>{num(revoked)}</b><small>From last {WINDOW} program transactions</small></div>
        <div className="metric"><span>Credentials Verified</span><b>Read-only</b><small>Verification is a free read; it is not recorded on-chain</small></div>
        <div className="metric"><span>Network Status</span><b className={statusClass}>{statusText}</b><small>Live program check on {NETWORK_NAME}</small></div>
      </section>

      <section className="card">
        <h2>Inter-Agency Trust Network</h2>
        <p className="hint">How a credential moves between two agencies without any personal data being shared.</p>
        <div className="trust-flow">
          <div className="node">
            <span className="node-tag">Demo Agency A</span>
            <b>Credential Issuer</b>
            <p>Hashes the credential locally and signs with its wallet.</p>
          </div>
          <div className="link"><span>Issue</span><i aria-hidden>→</i></div>
          <div className="node core">
            <span className="node-tag">TrustBridge · on Solana</span>
            <b>Cryptographic Proof</b>
            <ul>
              <li>Credential hash (SHA-256)</li>
              <li>Issuer public key</li>
              <li>Validity / revocation status</li>
              <li>Timestamps</li>
            </ul>
          </div>
          <div className="link"><span>Read</span><i aria-hidden>→</i></div>
          <div className="node">
            <span className="node-tag">Demo Agency B</span>
            <b>Credential Verifier</b>
            <p>Reads the proof from the chain. Agency A is never contacted.</p>
          </div>
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2>TrustBridge Network</h2>
          <dl className="kv">
            <dt>Program</dt>
            <dd><a className="mono" href={solscanAccount(programId)} target="_blank" rel="noreferrer" title={programId}>{shorten(programId, 6)}</a></dd>
            <dt>Network</dt><dd>{NETWORK_NAME}</dd>
            <dt>Wallet</dt>
            <dd className="mono" title={publicKey?.toBase58()}>{connected && publicKey ? shorten(publicKey.toBase58(), 4) : "Not connected"}</dd>
            <dt>RPC</dt>
            <dd className={live === "error" ? "bad" : live === "checking" ? "" : "ok"}>{live === "error" ? "Unreachable" : live === "checking" ? "Checking…" : "Connected"} <small>({RPC_LABEL})</small></dd>
            <dt>Program Status</dt>
            <dd className={statusClass}>● {live === "yes" ? "Online" : statusText}</dd>
          </dl>
        </section>

        <section className="card privacy">
          <h2>Privacy by Design</h2>
          <p><strong>Personal information stays outside the blockchain.</strong></p>
          <p className="hint">
            TrustBridge anchors cryptographic proofs rather than storing citizens’ personal data on-chain.
          </p>
          <ul className="checks">
            <li>Hash-based verification</li>
            <li>Issuer identity</li>
            <li>Credential status</li>
            <li>Immutable audit trail</li>
          </ul>
        </section>
      </div>

      <div className="two-col wide-left">
        <section className="card">
          <h2>Recent Activity</h2>
          <p className="hint">Real transactions from {NETWORK_NAME} for this program.</p>
          {error && <div className="result invalid">{error}</div>}
          {!error && !loading && recent.length === 0 && (
            <p className="hint">No issue or revoke transactions yet. Issue a credential to see it here.</p>
          )}
          <ul className="activity">
            {recent.map((r) => (
              <li key={r.signature}>
                <span className={`dot ${r.kind === "revoke" ? "bad-dot" : "ok-dot"}`} aria-hidden />
                <div>
                  <b>{r.kind === "issue" ? "Credential Issued" : "Credential Revoked"}</b>
                  <div className="mono small">{shorten(r.signature, 8)}</div>
                </div>
                <div className="act-meta">
                  <span>{timeAgo(r.blockTime)}</span>
                  <a href={solscanTx(r.signature)} target="_blank" rel="noreferrer">Solscan ↗</a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Quick Actions</h2>
          <div className="qa">
            <button className="primary" onClick={() => go("/issue")}>Issue Credential</button>
            <button className="primary" onClick={() => go("/verify")}>Verify Credential</button>
            <button className="primary" onClick={() => go("/credentials")}>View Credentials</button>
            <button className="secondary" onClick={() => go("/agencies")}>View Agencies</button>
            <button className="secondary" onClick={() => go("/audit")}>View Audit Log</button>
          </div>
        </section>
      </div>
    </>
  );
}
