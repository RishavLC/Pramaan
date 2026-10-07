import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { CredentialView, fetchAllCredentials, fetchCredential } from "./credentials";
import { RegistryEntry, demoEntries, fromChain, mergeEntries } from "./registry";
import { useProgram } from "./useProgram";

// One shared cache so the registry, agency pages and detail pages do not each hit the RPC.
const TTL_MS = 60_000;
let cache: { at: number; views: CredentialView[] } | null = null;
export const invalidateRegistry = () => {
  cache = null;
};

export function useRegistry() {
  const program = useProgram(); // single Anchor client, read-only is enough here
  const [views, setViews] = useState<CredentialView[]>(cache?.views ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (force: boolean) => {
      if (!force && cache && Date.now() - cache.at < TTL_MS) {
        setViews(cache.views);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        const v = await fetchAllCredentials(program);
        cache = { at: Date.now(), views: v };
        setViews(v);
      } catch (e) {
        console.warn("[registry]", e); // detail for developers; users get a plain message
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [program]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const entries: RegistryEntry[] = error && views.length === 0 ? demoEntries() : mergeEntries(views);
  return { entries, onchainCount: views.length, loading, error, refresh: () => load(true) };
}

export type EntryState =
  | { status: "loading" }
  | { status: "found"; entry: RegistryEntry }
  | { status: "notfound" };

/** Resolve one credential by route id: demo id, cached registry, or a direct fetch (deep links / refresh). */
export function useCredentialEntry(id: string): EntryState {
  const program = useProgram();
  const [state, setState] = useState<EntryState>({ status: "loading" });

  useEffect(() => {
    let off = false;
    setState({ status: "loading" });
    const done = (s: EntryState) => !off && setState(s);

    const demo = demoEntries().find((e) => e.id === id);
    if (demo) {
      done({ status: "found", entry: demo });
      return () => { off = true; };
    }
    const cached = cache?.views.find((v) => v.pda.toBase58() === id);
    if (cached) {
      done({ status: "found", entry: fromChain(cached) });
      return () => { off = true; };
    }
    (async () => {
      try {
        const view = await fetchCredential(program, new PublicKey(id));
        done(view ? { status: "found", entry: fromChain(view) } : { status: "notfound" });
      } catch {
        done({ status: "notfound" }); // invalid address or unreachable account: same friendly screen
      }
    })();
    return () => { off = true; };
  }, [id, program]);

  return state;
}

export interface ProofTxs {
  loading: boolean;
  issueSig: string | null;
  revokeSig: string | null;
}

/** Real transaction signatures that touched this credential account (issue = oldest, revoke = newest). */
export function useProofTxs(pda: string | null, revoked: boolean): ProofTxs {
  const { connection } = useConnection();
  const [txs, setTxs] = useState<ProofTxs>({ loading: Boolean(pda), issueSig: null, revokeSig: null });

  useEffect(() => {
    if (!pda) {
      setTxs({ loading: false, issueSig: null, revokeSig: null });
      return;
    }
    let off = false;
    setTxs({ loading: true, issueSig: null, revokeSig: null });
    connection
      .getSignaturesForAddress(new PublicKey(pda), { limit: 20 }, "confirmed")
      .then((sigs) => {
        if (off) return;
        const ok = sigs.filter((s) => s.err === null); // newest first
        const issue = ok.length ? ok[ok.length - 1].signature : null;
        const revoke = revoked && ok.length > 1 ? ok[0].signature : null;
        setTxs({ loading: false, issueSig: issue, revokeSig: revoke });
      })
      .catch(() => !off && setTxs({ loading: false, issueSig: null, revokeSig: null }));
    return () => { off = true; };
  }, [pda, revoked, connection]);

  return txs;
}
