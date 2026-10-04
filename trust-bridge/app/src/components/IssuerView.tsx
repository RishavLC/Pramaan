import { useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { CredentialView, IssueResult, fetchCredential, issueCredential, revokeCredential } from "../lib/credentials";
import { solscanAccount, solscanTx } from "../lib/config";
import { explainError } from "../lib/errors";
import { fmtTime, useProgram } from "../lib/useProgram";

const SAMPLE = "Rishav Shrestha, Kathmandu-10, verified 2026-10-02";

interface Props {
  onChanged: () => void;
  onVerify: (pda: string) => void;
}

export default function IssuerView({ onChanged, onVerify }: Props) {
  const wallet = useAnchorWallet();
  const program = useProgram();

  const [text, setText] = useState(SAMPLE);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssueResult | null>(null);
  const [issueError, setIssueError] = useState("");

  const [revokePda, setRevokePda] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [revokeSig, setRevokeSig] = useState("");
  const [revokedView, setRevokedView] = useState<CredentialView | null>(null);
  const [revokeError, setRevokeError] = useState("");

  async function handleIssue() {
    if (!wallet) return;
    setIssueError("");
    setIssued(null);
    setIssuing(true);
    try {
      const res = await issueCredential(program, wallet.publicKey, text.trim());
      setIssued(res);
      setRevokePda(res.pda.toBase58());
      setRevokeSig("");
      setRevokedView(null);
      onChanged();
    } catch (e) {
      setIssueError(explainError(e));
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevoke() {
    if (!wallet) return;
    setRevokeError("");
    setRevokeSig("");
    setRevokedView(null);
    setRevoking(true);
    try {
      const pda = new PublicKey(revokePda.trim());
      const sig = await revokeCredential(program, wallet.publicKey, pda);
      setRevokeSig(sig);
      setRevokedView(await fetchCredential(program, pda));
      onChanged();
    } catch (e) {
      setRevokeError(explainError(e));
    } finally {
      setRevoking(false);
    }
  }

  return (
    <>
      <section className="card">
        <h2>Agency A · Issue a credential</h2>
        <p className="hint">
          The text is hashed in your browser. Only the 32-byte hash and your public key are
          stored on-chain. No personal data leaves this page.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        <div className="actions">
          <button className="primary" onClick={handleIssue} disabled={!wallet || issuing || !text.trim()}>
            {issuing ? "Issuing…" : "Issue Credential"}
          </button>
          {!wallet && <span className="hint">Connect your wallet first.</span>}
        </div>
        {issueError && <div className="result invalid">{issueError}</div>}
        {issued && (
          <div className="result valid">
            <strong>Credential issued.</strong>
            <dl>
              <dt>Signature</dt>
              <dd className="mono">{issued.signature}</dd>
              <dt>Solscan</dt>
              <dd>
                <a href={solscanTx(issued.signature)} target="_blank" rel="noreferrer">
                  View transaction
                </a>
              </dd>
              <dt>Credential PDA</dt>
              <dd className="mono">
                <a href={solscanAccount(issued.pda.toBase58())} target="_blank" rel="noreferrer">
                  {issued.pda.toBase58()}
                </a>
              </dd>
              <dt>Hash</dt>
              <dd className="mono">{issued.credentialHashHex}</dd>
            </dl>
            <button className="secondary" onClick={() => onVerify(issued.pda.toBase58())}>
              Verify as Agency B →
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Agency A · Revoke a credential</h2>
        <p className="hint">Only the wallet that issued the credential can revoke it. The program enforces this.</p>
        <input
          value={revokePda}
          onChange={(e) => setRevokePda(e.target.value)}
          placeholder="Credential PDA"
          spellCheck={false}
        />
        <div className="actions">
          <button className="danger" onClick={handleRevoke} disabled={!wallet || revoking || !revokePda.trim()}>
            {revoking ? "Revoking…" : "Revoke Credential"}
          </button>
        </div>
        {revokeError && <div className="result invalid">{revokeError}</div>}
        {revokeSig && (
          <div className="result invalid">
            <strong>Credential revoked.</strong>
            <dl>
              <dt>Status</dt>
              <dd>{revokedView ? (revokedView.isValid ? "Valid" : "Revoked") : "…"}</dd>
              <dt>Revoked at</dt>
              <dd>{revokedView ? fmtTime(revokedView.revokedAt) : "…"}</dd>
              <dt>Signature</dt>
              <dd className="mono">{revokeSig}</dd>
              <dt>Solscan</dt>
              <dd>
                <a href={solscanTx(revokeSig)} target="_blank" rel="noreferrer">
                  View transaction
                </a>
              </dd>
            </dl>
            <button className="secondary" onClick={() => onVerify(revokePda.trim())}>
              Verify again →
            </button>
          </div>
        )}
      </section>
    </>
  );
}
