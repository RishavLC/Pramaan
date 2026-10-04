import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { HAS_HELIUS, PROGRAM_ID, shorten, solscanAccount } from "../lib/config";
import { sha256, toHex } from "../lib/hash";
import { deriveCredentialPda } from "../lib/pda";

const SAMPLE = "Rishav Shrestha, Kathmandu-10, verified 2026-10-02";

const DEMO_STEPS = [
  "Open the app and connect Phantom on devnet.",
  "Agency A · Issuer tab: enter the credential text, click Issue Credential.",
  "Show the transaction signature and the Solscan link.",
  "Click “Verify as Agency B”. The credential address is already filled in. Click Verify.",
  "Result: “Valid. Issued by [Agency A pubkey].”",
  "Back in Agency A · Issuer, click Revoke Credential.",
  "Click “Verify again” and show: “Invalid. Credential revoked.”",
  "Say: “This verification worked without Agency B ever contacting Agency A.”",
];

export default function StatusPanel() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [balance, setBalance] = useState<number | null>(null);
  const [deployed, setDeployed] = useState<"checking" | "yes" | "no" | "error">("checking");
  const [text, setText] = useState(SAMPLE);
  const [hashHex, setHashHex] = useState("");
  const [pda, setPda] = useState("");

  useEffect(() => {
    let cancelled = false;
    setDeployed("checking");
    connection
      .getAccountInfo(PROGRAM_ID)
      .then((info) => !cancelled && setDeployed(info?.executable ? "yes" : "no"))
      .catch(() => !cancelled && setDeployed("error"));
    return () => {
      cancelled = true;
    };
  }, [connection]);

  useEffect(() => {
    let cancelled = false;
    setBalance(null);
    if (!wallet) return;
    connection
      .getBalance(wallet.publicKey)
      .then((lamports) => !cancelled && setBalance(lamports / LAMPORTS_PER_SOL))
      .catch(() => !cancelled && setBalance(null));
    return () => {
      cancelled = true;
    };
  }, [connection, wallet]);

  useEffect(() => {
    let cancelled = false;
    sha256(text).then((h) => {
      if (cancelled) return;
      setHashHex(toHex(h));
      setPda(wallet ? deriveCredentialPda(wallet.publicKey, h).toBase58() : "");
    });
    return () => {
      cancelled = true;
    };
  }, [text, wallet]);

  return (
    <>
      <section className="card">
        <h2>Connection</h2>
        <dl>
          <dt>Network</dt>
          <dd>Solana devnet</dd>
          <dt>RPC</dt>
          <dd>{HAS_HELIUS ? "Helius devnet" : "Public devnet (set VITE_HELIUS_API_KEY for Helius)"}</dd>
          <dt>Program</dt>
          <dd>
            <a href={solscanAccount(PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer">
              {PROGRAM_ID.toBase58()}
            </a>
          </dd>
          <dt>Deployed</dt>
          <dd className={deployed === "yes" ? "ok" : deployed === "checking" ? "" : "bad"}>
            {deployed === "checking" && "Checking…"}
            {deployed === "yes" && "Yes, program is live on devnet"}
            {deployed === "no" && "No. Run `npm run deploy:devnet` in the repo root"}
            {deployed === "error" && "Could not reach RPC. Check your Helius key"}
          </dd>
          <dt>Wallet</dt>
          <dd>{wallet ? shorten(wallet.publicKey.toBase58(), 6) : "Not connected"}</dd>
          <dt>Balance</dt>
          <dd>{wallet ? (balance === null ? "…" : `${balance.toFixed(3)} SOL`) : "—"}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>60-second demo flow</h2>
        <ol className="steps">
          {DEMO_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>Hash &amp; PDA preview</h2>
        <p className="hint">
          Only the SHA-256 hash is ever sent on-chain. The credential address is derived from the
          issuer wallet and the hash.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        <dl>
          <dt>SHA-256</dt>
          <dd className="mono">{hashHex}</dd>
          <dt>Credential PDA</dt>
          <dd className="mono">{pda || "Connect a wallet to derive the PDA"}</dd>
        </dl>
      </section>
    </>
  );
}
