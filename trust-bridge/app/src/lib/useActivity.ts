import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "./config";
import { explainError } from "./errors";

export type ActivityKind = "issue" | "revoke" | "other";

export interface ActivityRow {
  signature: string;
  slot: number;
  blockTime: number | null;
  ok: boolean;
  kind: ActivityKind;
  label: string;
  signer: string | null;
}

const prettify = (name: string) => name.replace(/([A-Z])/g, " $1").trim();

/** Real on-chain activity: recent transactions that touched the Pramaan program, labelled from program logs. */
export function useActivity(limit: number, refreshKey = 0) {
  const { connection } = useConnection();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sigs = await connection.getSignaturesForAddress(PROGRAM_ID, { limit }, "confirmed");

      const labels = new Map<string, string>();
      const signers = new Map<string, string>();
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
            if (m) labels.set(sigs[i].signature, m[1]);
            const payer = tx?.transaction.message.accountKeys[0]?.pubkey;
            if (payer) signers.set(sigs[i].signature, payer.toBase58());
          });
        } catch {
          /* labels are optional */
        }
      }

      setRows(
        sigs.map((s) => {
          const raw = labels.get(s.signature);
          const kind: ActivityKind = raw === "IssueCredential" ? "issue" : raw === "RevokeCredential" ? "revoke" : "other";
          return {
            signature: s.signature,
            slot: s.slot,
            blockTime: s.blockTime ?? null,
            ok: s.err === null,
            kind,
            label: raw ? prettify(raw) : "Transaction",
            signer: signers.get(s.signature) ?? null,
          };
        })
      );
    } catch (e) {
      setError(explainError(e));
    } finally {
      setLoading(false);
    }
  }, [connection, limit]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return { rows, loading, error, reload: load };
}

export function timeAgo(unixSeconds: number | null): string {
  if (!unixSeconds) return "time unavailable";
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
