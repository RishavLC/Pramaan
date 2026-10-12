import { useState } from "react";
import { findAgencyByKey } from "../data/agencies";
import { shorten, solscanTx } from "../lib/config";
import { fmtDateTime } from "../lib/registry";
import { useActivity } from "../lib/useActivity";
import { EmptyState, PageHeader, Skeleton } from "./ui";

type Filter = "all" | "issue" | "revoke";

export default function HistoryView({ refreshKey }: { refreshKey: number }) {
  const { rows, loading, error, reload } = useActivity(15, refreshKey);
  const [filter, setFilter] = useState<Filter>("all");

  const shown = rows.filter((r) => filter === "all" || r.kind === filter);
  const what = (k: string) => (k === "issue" ? "Credential issued" : k === "revoke" ? "Credential cancelled" : "Other activity");
  const who = (key: string | null) => {
    if (!key) return "—";
    return findAgencyByKey(key)?.name ?? `Wallet ${shorten(key, 4)}`;
  };

  return (
    <>
      <PageHeader
        title="Activity History"
        subtitle="A public record of every credential issued or cancelled. Each line links to its proof on the blockchain."
      />

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filter activity">
          {([["all", "All"], ["issue", "Issued"], ["revoke", "Cancelled"]] as const).map(([k, label]) => (
            <button key={k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        <button className="secondary toolbar-btn" onClick={reload} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      {error && <div className="result invalid">{error}</div>}

      <section className="card table-card">
        {loading && rows.length === 0 ? (
          <Skeleton lines={4} />
        ) : shown.length === 0 && !error ? (
          <EmptyState title="No activity yet" text="Issue a credential and it will appear here." />
        ) : (
          <table className="reg">
            <thead>
              <tr><th>When</th><th>What happened</th><th>By</th><th>Result</th><th>Proof</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.signature}>
                  <td data-label="When">{r.blockTime ? fmtDateTime(r.blockTime) : "—"}</td>
                  <td data-label="What happened"><b>{what(r.kind)}</b></td>
                  <td data-label="By">{who(r.signer)}</td>
                  <td data-label="Result">{r.ok ? <span className="ok">✓ Done</span> : <span className="bad">✕ Failed</span>}</td>
                  <td data-label="Proof"><a href={solscanTx(r.signature)} target="_blank" rel="noreferrer">View ↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="hint">Showing the 15 most recent actions. Checking a credential is not recorded, because it is only a read.</p>
    </>
  );
}
