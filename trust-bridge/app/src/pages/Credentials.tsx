import { useMemo, useState } from "react";
import { UNKNOWN_TYPE, fmtDay } from "../lib/registry";
import { href, navigate } from "../lib/route";
import { useRegistry } from "../lib/useRegistry";
import { EmptyState, EnvTags, PageHeader, Skeleton, SourceBadge, StatusBadge } from "../components/ui";
import type { CredentialSource, CredentialStatus } from "../lib/registry";

export default function Credentials() {
  const { entries, onchainCount, loading, error, refresh } = useRegistry();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | CredentialStatus>("all");
  const [type, setType] = useState("all");
  const [issuer, setIssuer] = useState("all");
  const [source, setSource] = useState<"all" | CredentialSource>("all");

  const types = useMemo(() => Array.from(new Set(entries.map((e) => e.type))).sort(), [entries]);
  const issuers = useMemo(() => Array.from(new Set(entries.map((e) => e.issuerName))).sort(), [entries]);

  const shown = entries
    .filter((e) => {
      const hay = `${e.displayId} ${e.type} ${e.issuerName} ${e.issuerKey} ${e.hashHex} ${e.pda ?? ""}`.toLowerCase();
      return (
        (status === "all" || e.status === status) &&
        (type === "all" || e.type === type) &&
        (issuer === "all" || e.issuerName === issuer) &&
        (source === "all" || e.source === source) &&
        hay.includes(q.trim().toLowerCase())
      );
    })
    .sort((a, b) => b.issuedAt - a.issuedAt);

  const clear = () => { setQ(""); setStatus("all"); setType("all"); setIssuer("all"); setSource("all"); };

  return (
    <>
      <PageHeader title="Credential Registry" subtitle="Verifiable credentials anchored through TrustBridge.">
        <EnvTags />
      </PageHeader>

      {error && (
        <div className="notice bad-note">
          Could not load on-chain credentials right now (RPC or program unavailable). Showing demo credentials only.
        </div>
      )}

      <div className="toolbar">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search credentials..." aria-label="Search credentials" />
        <div className="seg" role="group" aria-label="Filter by status">
          {(["all", "valid", "revoked"] as const).map((s) => (
            <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : s === "valid" ? "Valid" : "Revoked"}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by credential type">
          <option value="all">All types</option>
          {types.map((t) => <option key={t} value={t}>{t === UNKNOWN_TYPE ? "Unspecified" : t}</option>)}
        </select>
        <select value={issuer} onChange={(e) => setIssuer(e.target.value)} aria-label="Filter by issuer">
          <option value="all">All issuers</option>
          {issuers.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} aria-label="Filter by source">
          <option value="all">On-chain + Demo</option>
          <option value="onchain">On-chain only</option>
          <option value="demo">Demo only</option>
        </select>
        <button className="secondary toolbar-btn" onClick={refresh} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      <p className="hint">
        {loading ? "Loading credentials from Solana Devnet…" : `${onchainCount} on-chain record${onchainCount === 1 ? "" : "s"} found on Devnet, plus ${entries.length - onchainCount} fictional demo credentials.`}
      </p>

      <section className="card table-card">
        {loading && entries.length === 0 ? (
          <Skeleton lines={4} />
        ) : shown.length === 0 ? (
          <EmptyState
            title="No Credentials Found"
            text="No credentials match your current filters."
            action={<button className="secondary" onClick={clear}>Clear Filters</button>}
          />
        ) : (
          <table className="reg">
            <thead>
              <tr><th>Credential ID</th><th>Type</th><th>Issuer</th><th>Source</th><th>Status</th><th>Issued</th></tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} onClick={() => navigate(`/credentials/${e.id}`)}>
                  <td data-label="Credential ID"><a href={href(`/credentials/${e.id}`)} onClick={(ev) => ev.stopPropagation()} className="mono">{e.displayId}</a></td>
                  <td data-label="Type">{e.type === UNKNOWN_TYPE ? <span className="small">Unspecified</span> : e.type}</td>
                  <td data-label="Issuer">{e.issuerName}</td>
                  <td data-label="Source"><SourceBadge source={e.source} /></td>
                  <td data-label="Status"><StatusBadge status={e.status} /></td>
                  <td data-label="Issued">{fmtDay(e.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
