import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { HAS_HELIUS, PROGRAM_ID, shorten, solscanTx } from "../lib/config";
import { explainError } from "../lib/errors";

interface Row {
  signature: string;
  slot: number;
  blockTime: number | null;
  ok: boolean;
  label: string;
}

const prettify = (name: string) => name.replace(/([A-Z])/g, " $1").trim();

export default function HistoryView({ refreshKey }: { refreshKey: number }) {
  const { connection } = useConnection();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Recent transactions that touched the TrustBridge program.
      const sigs = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 15 }, "confirmed");

      // Best-effort: label each tx (Issue / Revoke / Verify) from its program logs.
      const labels = new Map<string, string>();
      if (sigs.length > 0) {
        try {
          const txs = await connection.getParsedTransactions(
            sigs.map((s) => s.signature),
            { maxSupportedTransactionVersion: 0, commitment: "confirmed" }
          );
          txs.forEach((tx, i) => {
            const log = tx?.meta?.logMessages?.find((l) =>
              /Instruction: (Issue|Revoke|Verify)Credential/.test(l)
            );
            const m = log?.match(/Instruction: (\w+)/);
            if (m) labels.set(sigs[i].signature, prettify(m[1]));
          });
        } catch {
          /* labels are optional */
        }
      }

      setRows(
        sigs.map((s) => ({
          signature: s.signature,
          slot: s.slot,
          blockTime: s.blockTime ?? null,
          ok: s.err === null,
          label: labels.get(s.signature) ?? "Transaction",
        }))
      );
    } catch (e) {
      setError(explainError(e));
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Transaction history</h2>
        <button className="secondary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <p className="hint">
        Latest 15 transactions for program {shorten(PROGRAM_ID.toBase58(), 6)}, fetched
        {HAS_HELIUS ? " via Helius RPC" : " via public devnet RPC"}.
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
            <a href={solscanTx(r.signature)} target="_blank" rel="noreferrer">
              Solscan ↗
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
