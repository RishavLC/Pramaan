import { NETWORK_NAME, PROGRAM_ID, solscanAccount, solscanTx } from "../lib/config";
import { UNKNOWN_TYPE, fmtDateTime, fmtDay } from "../lib/registry";
import { href, navigate } from "../lib/route";
import { useCredentialEntry, useProofTxs } from "../lib/useRegistry";
import { CopyButton, EmptyState, EnvTags, KeyValue, Skeleton, SourceBadge, StatusBadge } from "../components/ui";

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function CredentialDetails({ id }: { id: string }) {
  const state = useCredentialEntry(id);
  const entry = state.status === "found" ? state.entry : null;
  const txs = useProofTxs(entry?.pda ?? null, entry?.status === "revoked");

  if (state.status === "loading") {
    return (
      <section className="card">
        <h2>Loading credential...</h2>
        <Skeleton lines={5} />
      </section>
    );
  }

  if (state.status === "notfound" || !entry) {
    return (
      <section className="card">
        <p><StatusBadge status="notfound" /></p>
        <EmptyState
          title="Credential Not Found"
          text="We could not locate this credential on the TrustBridge network. The credential may not exist or may not be available on the current Devnet environment."
          action={<a className="btn-link" href={href("/credentials")}>Back to Credential Registry</a>}
        />
      </section>
    );
  }

  const demo = entry.source === "demo";
  const programId = PROGRAM_ID.toBase58();
  const typeLabel = entry.type === UNKNOWN_TYPE ? "Not recorded on-chain (kept off-chain)" : entry.type;

  const timeline = entry.events.map((ev) => ({
    ...ev,
    sig: ev.kind === "issued" ? txs.issueSig : ev.kind === "revoked" ? txs.revokeSig : null,
  }));

  return (
    <>
      <p className="crumbs"><a href={href("/credentials")}>Credential Registry</a> / {entry.displayId}</p>

      <section className="card cred-head">
        <div className="badge-row"><EnvTags /><SourceBadge source={entry.source} /></div>
        <h2 className="mono-title">{entry.displayId}</h2>
        <StatusBadge status={entry.status} />
        <p className="cred-type">{typeLabel}</p>
        {demo && <p className="small">Demo credential. This record is fictional and is not on Solana.</p>}
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Credential Information</h2>
          <dl className="kv">
            <dt>Credential ID</dt><dd className="mono">{entry.displayId}</dd>
            <dt>Credential Type</dt><dd>{typeLabel}</dd>
            <dt>Status</dt><dd><StatusBadge status={entry.status} /></dd>
            <dt>Issued</dt><dd>{fmtDay(entry.issuedAt)}</dd>
            <dt>Valid Until</dt><dd>No expiry recorded</dd>
            <dt>Issuer</dt>
            <dd>
              {entry.agencyId ? <a href={href(`/agencies/${entry.agencyId}`)}>{entry.issuerName}</a> : entry.issuerName}
            </dd>
          </dl>
          {!demo && <p className="small">The credential ID is derived from the first characters of the hash. The program does not store IDs or types.</p>}
        </section>

        <section className="card" id="proof">
          <h2>Blockchain Proof</h2>
          {demo ? (
            <>
              <p className="hint">Demo credential: there is no on-chain record, PDA or transaction.</p>
              <dl className="kv">
                <dt>Network</dt><dd>{NETWORK_NAME}</dd>
                <dt>Credential Hash</dt><dd><KeyValue value={entry.hashHex} chars={8} /></dd>
              </dl>
            </>
          ) : (
            <dl className="kv">
              <dt>Network</dt><dd>{NETWORK_NAME}</dd>
              <dt>Program</dt><dd><KeyValue value={programId} /></dd>
              <dt>Credential PDA</dt><dd><KeyValue value={entry.pda ?? ""} /></dd>
              <dt>Credential Hash</dt><dd><KeyValue value={entry.hashHex} chars={8} /></dd>
              <dt>Issuer Public Key</dt><dd><KeyValue value={entry.issuerKey} /></dd>
              <dt>Issued At</dt><dd>{fmtDateTime(entry.issuedAt)}</dd>
              <dt>Revoked At</dt><dd>{entry.revokedAt ? fmtDateTime(entry.revokedAt) : "Not revoked"}</dd>
            </dl>
          )}
          {!demo && (
            <div className="links">
              {txs.loading ? (
                <span className="small">Looking up transactions…</span>
              ) : txs.issueSig ? (
                <a href={solscanTx(txs.issueSig)} target="_blank" rel="noreferrer">View Transaction on Solscan ↗</a>
              ) : (
                <span className="small">Transaction signature not available from this RPC.</span>
              )}
              {entry.pda && <a href={solscanAccount(entry.pda)} target="_blank" rel="noreferrer">View Account on Solscan ↗</a>}
            </div>
          )}
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Hash Visualization</h2>
          <ol className="vflow">
            <li>
              <div className="vnode">
                Personal Credential Data
                <small>{demo && entry.sampleText ? `Sample (fictional): ${entry.sampleText}` : "Kept off-chain. Not visible to TrustBridge."}</small>
              </div>
              <div className="vedge" aria-hidden><span>│</span><em>SHA-256</em><span>▼</span></div>
            </li>
            <li>
              <div className="vnode core mono">{entry.hashHex.slice(0, 6)}…{entry.hashHex.slice(-4)}</div>
              <div className="vedge" aria-hidden><span>│</span><em>{demo ? "would be anchored as" : "anchored as"}</em><span>▼</span></div>
            </li>
            <li><div className="vnode">Solana Credential Record{demo ? " (demo: not created)" : ""}</div></li>
          </ol>
        </section>

        <section className="card privacy">
          <h2>Privacy Protection</h2>
          <p><strong>Personal information is not stored directly on-chain.</strong></p>
          <p className="hint">TrustBridge stores cryptographic proof needed to verify the credential without exposing the underlying personal data.</p>
          <ul className="checks">
            <li>Personal data remains off-chain</li>
            <li>Cryptographic hash anchored on Solana</li>
            <li>Issuer identity recorded</li>
            <li>Credential status recorded</li>
          </ul>
        </section>
      </div>

      <section className="card" id="lifecycle">
        <h2>Credential Lifecycle</h2>
        <ol className="timeline">
          {timeline.map((ev, i) => (
            <li key={i} className={ev.kind}>
              <span className="tl-dot" aria-hidden />
              <div>
                <b>{ev.kind.toUpperCase()}</b>{ev.demo && <span className="tag">demo event</span>}
                <div className="small">{fmtDateTime(ev.at)}</div>
                {ev.sig && <a className="small" href={solscanTx(ev.sig)} target="_blank" rel="noreferrer">Transaction on Solscan ↗</a>}
              </div>
            </li>
          ))}
        </ol>
        {!demo && <p className="small">Verification checks are free reads and are not recorded on-chain, so no VERIFIED events are shown.</p>}
      </section>

      <section className="card">
        <h2>Actions</h2>
        <div className="actions">
          {entry.status === "valid" ? (
            <button
              className="primary"
              disabled={!entry.pda}
              title={entry.pda ? undefined : "Demo credentials have no on-chain record to verify"}
              onClick={() => entry.pda && navigate(`/verify?pda=${entry.pda}`)}
            >
              Verify Credential
            </button>
          ) : (
            <button className="secondary" onClick={() => scrollTo("lifecycle")}>View Revocation</button>
          )}
          <button className="secondary" onClick={() => scrollTo("proof")}>View Blockchain Proof</button>
          <CopyButton value={entry.hashHex} label="Copy hash" />
        </div>
      </section>
    </>
  );
}
