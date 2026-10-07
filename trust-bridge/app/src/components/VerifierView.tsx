import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { CredentialView, fetchCredential } from "../lib/credentials";
import { solscanAccount } from "../lib/config";
import { explainError } from "../lib/errors";
import { sha256 } from "../lib/hash";
import { deriveCredentialPda } from "../lib/pda";
import { fmtTime, useProgram } from "../lib/useProgram";

type Result =
  | { kind: "valid" | "revoked"; view: CredentialView }
  | { kind: "missing"; pda: PublicKey };

interface Props {
  prefillPda: string;
}

export default function VerifierView({ prefillPda }: Props) {
  const program = useProgram(); // read-only: no wallet needed to verify

  const [mode, setMode] = useState<"pda" | "text">("pda");
  const [pdaInput, setPdaInput] = useState("");
  const [issuerInput, setIssuerInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [whitelist, setWhitelist] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  // When the Issuer view hands over a PDA, prefill it and clear the old result.
  useEffect(() => {
    if (prefillPda) {
      setMode("pda");
      setPdaInput(prefillPda);
      setResult(null);
      setError("");
    }
  }, [prefillPda]);

  async function handleVerify() {
    setError("");
    setResult(null);
    setBusy(true);
    try {
      let pda: PublicKey;
      if (mode === "pda") {
        pda = new PublicKey(pdaInput.trim());
      } else {
        const issuer = new PublicKey(issuerInput.trim());
        pda = deriveCredentialPda(issuer, await sha256(textInput.trim()));
      }
      const view = await fetchCredential(program, pda);
      setResult(view ? { kind: view.isValid ? "valid" : "revoked", view } : { kind: "missing", pda });
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }

  const trusted = (issuer: string) => {
    const list = whitelist.split(/[\s,]+/).filter(Boolean);
    if (list.length === 0) return null;
    return list.includes(issuer);
  };

  const canVerify =
    mode === "pda" ? pdaInput.trim().length > 0 : issuerInput.trim().length > 0 && textInput.trim().length > 0;

  return (
    <>
      <section className="card">
        <h2>Agency B · Verify a credential</h2>
        <p className="hint">
          Reads the record directly from Solana. No wallet is needed and Agency A is never contacted.
        </p>

        <div className="seg">
          <button className={mode === "pda" ? "active" : ""} onClick={() => setMode("pda")}>
            By credential address
          </button>
          <button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>
            By credential text + issuer
          </button>
        </div>

        {mode === "pda" ? (
          <input
            value={pdaInput}
            onChange={(e) => setPdaInput(e.target.value)}
            placeholder="Credential PDA"
            spellCheck={false}
          />
        ) : (
          <>
            <input
              value={issuerInput}
              onChange={(e) => setIssuerInput(e.target.value)}
              placeholder="Issuer public key (Agency A)"
              spellCheck={false}
            />
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={2}
              placeholder="Credential text, exactly as issued"
            />
          </>
        )}

        <details>
          <summary>Trusted issuers (optional whitelist)</summary>
          <textarea
            value={whitelist}
            onChange={(e) => setWhitelist(e.target.value)}
            rows={2}
            placeholder="Paste trusted agency public keys, separated by spaces or commas"
          />
        </details>

        <div className="actions">
          <button className="primary" onClick={handleVerify} disabled={busy || !canVerify}>
            {busy ? "Verifying…" : "Verify Credential"}
          </button>
        </div>

        {error && <div className="result invalid">{error}</div>}

        {result?.kind === "valid" && (
          <div className="result valid">
            <div className="headline">Valid. Issued by {result.view.issuer.toBase58()}.</div>
            <Details view={result.view} trusted={trusted(result.view.issuer.toBase58())} />
          </div>
        )}
        {result?.kind === "revoked" && (
          <div className="result invalid">
            <div className="headline">Invalid. Credential revoked.</div>
            <Details view={result.view} trusted={trusted(result.view.issuer.toBase58())} />
          </div>
        )}
        {result?.kind === "missing" && (
          <div className="result invalid">
            <div className="headline">Not found. No credential exists at this address.</div>
            <p className="mono">{result.pda.toBase58()}</p>
          </div>
        )}
        {result && result.kind !== "missing" && (
          <p className="hint">Verified straight from the chain. Agency A was not contacted.</p>
        )}
      </section>
    </>
  );
}

function Details({ view, trusted }: { view: CredentialView; trusted: boolean | null }) {
  return (
    <dl>
      <dt>Status</dt>
      <dd>{view.isValid ? "Valid" : "Revoked"}</dd>
      <dt>Issuer</dt>
      <dd className="mono">{view.issuer.toBase58()}</dd>
      {trusted !== null && (
        <>
          <dt>Whitelist</dt>
          <dd className={trusted ? "ok" : "bad"}>
            {trusted ? "Issuer is on your trusted list" : "Issuer is NOT on your trusted list"}
          </dd>
        </>
      )}
      <dt>Credential hash</dt>
      <dd className="mono">{view.credentialHashHex}</dd>
      <dt>Issued at</dt>
      <dd>{fmtTime(view.issuedAt)}</dd>
      {!view.isValid && (
        <>
          <dt>Revoked at</dt>
          <dd>{fmtTime(view.revokedAt)}</dd>
        </>
      )}
      <dt>Account</dt>
      <dd className="mono">
        <a href={solscanAccount(view.pda.toBase58())} target="_blank" rel="noreferrer">
          {view.pda.toBase58()}
        </a>
      </dd>
    </dl>
  );
}
