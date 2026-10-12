import { useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { CredentialView, IssueResult, fetchCredential, issueCredential, revokeCredential } from "../lib/credentials";
import { solscanTx } from "../lib/config";
import { explainError } from "../lib/errors";
import { fmtTime, useProgram } from "../lib/useProgram";
import { KeyValue, PageHeader } from "./ui";

const EXAMPLE = "Residential address of Ram Sharma, Ward 10, Kathmandu";

interface Props {
  onChanged: () => void;
  onVerify: (pda: string) => void;
}

export default function IssuerView({ onChanged, onVerify }: Props) {
  const wallet = useAnchorWallet();
  const program = useProgram();

  const [text, setText] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssueResult | null>(null);
  const [issueError, setIssueError] = useState("");

  const [cancelId, setCancelId] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelSig, setCancelSig] = useState("");
  const [cancelledView, setCancelledView] = useState<CredentialView | null>(null);
  const [cancelError, setCancelError] = useState("");

  async function handleIssue() {
    if (!wallet) return;
    setIssueError("");
    setIssued(null);
    setIssuing(true);
    try {
      const res = await issueCredential(program, wallet.publicKey, text.trim());
      setIssued(res);
      setCancelId(res.pda.toBase58());
      setCancelSig("");
      setCancelledView(null);
      onChanged();
    } catch (e) {
      setIssueError(explainError(e));
    } finally {
      setIssuing(false);
    }
  }

  async function handleCancel() {
    if (!wallet) return;
    setCancelError("");
    setCancelSig("");
    setCancelledView(null);
    setCancelling(true);
    try {
      const pda = new PublicKey(cancelId.trim());
      const sig = await revokeCredential(program, wallet.publicKey, pda);
      setCancelSig(sig);
      setCancelledView(await fetchCredential(program, pda));
      onChanged();
    } catch (e) {
      setCancelError(explainError(e));
    } finally {
      setCancelling(false);
    }
  }

  const needWallet = !wallet;

  return (
    <>
      <PageHeader
        title="Issue & Cancel Credentials"
        subtitle="For the issuing agency. Create a credential, or cancel one you issued earlier. You approve each action in Phantom."
      />

      <ol className="how-strip" aria-label="How it works">
        <li><b>1. Issue</b><span>You create a credential.</span></li>
        <li><b>2. Others check</b><span>Any agency can confirm it is real.</span></li>
        <li><b>3. Cancel if needed</b><span>Everyone then sees it as cancelled.</span></li>
      </ol>

      {needWallet && (
        <div className="notice warn-note">Connect Phantom (top right) to issue or cancel credentials.</div>
      )}

      <section className="card">
        <h2>1. Issue a credential</h2>
        <label className="field-label" htmlFor="cred-text">What is this credential about?</label>
        <textarea
          id="cred-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={`Example: ${EXAMPLE}`}
        />
        <p className="hint">
          Only a secure fingerprint of this text is saved on the blockchain. The text itself stays on your computer.
        </p>
        <div className="actions">
          <button className="primary" onClick={handleIssue} disabled={needWallet || issuing || !text.trim()}>
            {issuing ? "Waiting for Phantom…" : "Issue credential"}
          </button>
          <button className="secondary" type="button" onClick={() => setText(EXAMPLE)} disabled={issuing}>
            Use example
          </button>
        </div>

        {issueError && <div className="result invalid">{issueError}</div>}

        {issued && (
          <div className="result valid">
            <strong>✓ Credential issued</strong>
            <dl>
              <dt>Credential ID</dt>
              <dd><KeyValue value={issued.pda.toBase58()} /></dd>
              <dt>Proof</dt>
              <dd><a href={solscanTx(issued.signature)} target="_blank" rel="noreferrer">View transaction on Solscan ↗</a></dd>
            </dl>
            <p className="small">Keep the Credential ID. It is how you cancel this credential later.</p>
            <div className="actions">
              <button className="secondary" onClick={() => onVerify(issued.pda.toBase58())}>Check it as another agency →</button>
            </div>
            <details>
              <summary>Technical details</summary>
              <dl>
                <dt>Fingerprint (SHA-256)</dt><dd className="mono">{issued.credentialHashHex}</dd>
                <dt>Transaction</dt><dd className="mono">{issued.signature}</dd>
              </dl>
            </details>
          </div>
        )}
      </section>

      <section className="card">
        <h2>2. Cancel a credential</h2>
        <label className="field-label" htmlFor="cancel-id">Credential ID</label>
        <input
          id="cancel-id"
          value={cancelId}
          onChange={(e) => setCancelId(e.target.value)}
          placeholder="Paste the Credential ID shown when it was issued"
          spellCheck={false}
        />
        <p className="hint">Only the wallet that issued a credential can cancel it. Cancelling cannot be undone.</p>
        <div className="actions">
          <button className="danger" onClick={handleCancel} disabled={needWallet || cancelling || !cancelId.trim()}>
            {cancelling ? "Waiting for Phantom…" : "Cancel credential"}
          </button>
        </div>

        {cancelError && <div className="result invalid">{cancelError}</div>}

        {cancelSig && (
          <div className="result invalid">
            <strong>✓ Credential cancelled</strong>
            <p className="small">Anyone who checks it will now see it as REVOKED.</p>
            <dl>
              <dt>Cancelled at</dt>
              <dd>{cancelledView ? fmtTime(cancelledView.revokedAt) : "…"}</dd>
              <dt>Proof</dt>
              <dd><a href={solscanTx(cancelSig)} target="_blank" rel="noreferrer">View transaction on Solscan ↗</a></dd>
            </dl>
            <div className="actions">
              <button className="secondary" onClick={() => onVerify(cancelId.trim())}>Check it again →</button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
