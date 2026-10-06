import { HAS_HELIUS, PROGRAM_ID, RPC_LABEL, shorten, solscanTx } from "../lib/config";
import { useActivity } from "../lib/useActivity";

export default function HistoryView({ refreshKey }: { refreshKey: number }) {
  const { rows, loading, error, reload } = useActivity(15, refreshKey);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Audit Log</h2>
        <button className="secondary" onClick={reload} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <p className="hint">
        Latest 15 transactions for program {shorten(PROGRAM_ID.toBase58(), 6)}, fetched via {HAS_HELIUS ? "Helius RPC" : RPC_LABEL}.
      </p>
      {error && <div className="result invalid">{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <p className="hint">No transactions yet. Issue a credential to see it here.</p>
      )}
      <ul className="history">
        {rows.map((r) => (
          <li key={r.signature}>
            <span className={`badge ${r.ok ? "ok" : "bad"}`}>{r.ok ? "Success" : "Failed"}</span>
            <span className="label">{r.label}</span>
            <span className="mono sig">{shorten(r.signature, 8)}</span>
            <span className="time">{r.blockTime ? new Date(r.blockTime * 1000).toLocaleString() : `slot ${r.slot}`}</span>
            <a href={solscanTx(r.signature)} target="_blank" rel="noreferrer">Solscan ↗</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
