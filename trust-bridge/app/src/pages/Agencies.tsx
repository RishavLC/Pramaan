import { useMemo, useState } from "react";
import { AGENCIES } from "../data/agencies";
import { agencyStats, fmtDateTime } from "../lib/registry";
import { href } from "../lib/route";
import { useRegistry } from "../lib/useRegistry";
import { AgencyIcon, AgencyStatusBadge, EmptyState, EnvTags, KeyValue, PageHeader } from "../components/ui";

type StatusFilter = "all" | "active" | "offline";

export default function Agencies() {
  const { entries } = useRegistry();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState("all");

  const types = useMemo(() => Array.from(new Set(AGENCIES.map((a) => a.type))), []);
  const shown = AGENCIES.filter((a) => {
    const text = `${a.name} ${a.type} ${a.publicKey}`.toLowerCase();
    return (
      (status === "all" || a.status === status) &&
      (type === "all" || a.type === type) &&
      text.includes(q.trim().toLowerCase())
    );
  });

  return (
    <>
      <PageHeader
        title="Agency Network"
        subtitle="Connected institutions participating in the TrustBridge credential verification network."
      >
        <EnvTags demoLabel="DEMO NETWORK" />
      </PageHeader>

      <div className="toolbar">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agencies..." aria-label="Search agencies" />
        <div className="seg" role="group" aria-label="Filter by status">
          {(["all", "active", "offline"] as const).map((s) => (
            <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : s === "active" ? "Active" : "Offline"}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by agency type">
          <option value="all">All agency types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No Agencies Found"
            text="No agencies match your current filters."
            action={<button className="secondary" onClick={() => { setQ(""); setStatus("all"); setType("all"); }}>Clear Filters</button>}
          />
        </div>
      ) : (
        <div className="agency-grid">
          {shown.map((a) => {
            const st = agencyStats(a, entries);
            return (
              <article key={a.id} className="card agency-card">
                <div className="agency-top">
                  <AgencyIcon icon={a.icon} />
                  <span className="tag">Demo Organization</span>
                </div>
                <h3>{a.name}</h3>
                <p className="hint">{a.type}</p>
                <AgencyStatusBadge status={a.status} />
                <dl className="kv compact">
                  <dt>Credentials Issued</dt><dd>{st.issued}</dd>
                  <dt>Credentials Verified</dt><dd>{st.verified ?? "Not recorded"}</dd>
                  <dt>Credentials Revoked</dt><dd>{st.revoked}</dd>
                  <dt>Last Activity</dt><dd>{fmtDateTime(st.lastActivity)}</dd>
                </dl>
                <p className="small">{st.source === "onchain" ? "On-chain statistics" : "Demo statistics"}</p>
                <div className="small">Public Key</div>
                <KeyValue value={a.publicKey} />
                <a className="btn-link" href={href(`/agencies/${a.id}`)}>View Agency</a>
              </article>
            );
          })}
        </div>
      )}
      <p className="hint">Status is part of the demo configuration. TrustBridge is not monitoring real institutions.</p>
    </>
  );
}
