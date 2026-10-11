import { useEffect, useMemo, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { NETWORK_NAME, solscanAccount, solscanTx } from "../lib/config";
import { DemoEngine, DemoRecord, liveEngine, simEngine } from "../lib/demoEngine";
import { explainError } from "../lib/errors";
import { fmtTime, useProgram } from "../lib/useProgram";
import { useProgramStatus } from "../lib/useProgramStatus";
import { EnvTags, KeyValue, PageHeader, StatusBadge } from "../components/ui";

const SAMPLE = "Residential address credential: Ward 10, Kathmandu (sample data)";
const newRunId = () => Math.random().toString(36).slice(2, 8);

interface Flow {
  issued: DemoRecord | null;
  verify1: DemoRecord | null | "notfound";
  revoked: DemoRecord | null;
  verify2: DemoRecord | null | "notfound";
}
const EMPTY: Flow = { issued: null, verify1: null, revoked: null, verify2: null };

export default function DemoFlow({ onChanged }: { onChanged: () => void }) {
  const wallet = useAnchorWallet();
  const program = useProgram();
  const status = useProgramStatus();

  const [text, setText] = useState(SAMPLE);
  const [runId, setRunId] = useState(newRunId);
  const [chooseSim, setChooseSim] = useState(false);
  const [flow, setFlow] = useState<Flow>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canLive = status === "yes" && !!wallet;
  const mode: "live" | "sim" = canLive && !chooseSim ? "live" : "sim";
  const engine: DemoEngine = useMemo(
    () => (mode === "live" && wallet ? liveEngine(program, wallet.publicKey) : simEngine),
    [mode, program, wallet]
  );

  // Switching between live and simulation starts a clean run.
  useEffect(() => {
    setFlow(EMPTY);
    setError("");
  }, [mode]);

  const reason =
    mode === "live"
      ? ""
      : chooseSim
        ? "You chose offline mode."
        : !wallet
          ? "Phantom is not connected."
          : status === "checking"
            ? "Checking the program on Devnet…"
            : "The TrustBridge program is not deployed on Devnet.";

  // The exact string that gets hashed. The run id makes every run produce a fresh credential.
  const credentialText = `${text.trim()} | run:${runId}`;

  async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(explainError(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const doIssue = () =>
    guard(async () => {
      const rec = await engine.issue(credentialText);
      setFlow({ ...EMPTY, issued: rec });
      if (engine.mode === "live") onChanged();
      return rec;
    });

  const doVerify1 = () =>
    guard(async () => {
      const rec = await engine.verify(credentialText);
      setFlow((f) => ({ ...f, verify1: rec ?? "notfound" }));
      return rec;
    });

  const doRevoke = (ref?: string) =>
    guard(async () => {
      const target = ref ?? flow.issued?.ref;
      if (!target) return undefined;
      const rec = await engine.revoke(target);
      setFlow((f) => ({ ...f, revoked: rec, verify2: null }));
      if (engine.mode === "live") onChanged();
      return rec;
    });

  const doVerify2 = () =>
    guard(async () => {
      const rec = await engine.verify(credentialText);
      setFlow((f) => ({ ...f, verify2: rec ?? "notfound" }));
      return rec;
    });

  async function runAll() {
    const a = await doIssue();
    if (!a) return;
    if (!(await doVerify1())) return;
    if (!(await doRevoke(a.ref))) return;
    await doVerify2();
  }

  function newRun() {
    setRunId(newRunId());
    setFlow(EMPTY);
    setError("");
  }

  const issued = flow.issued;
  const locked = Boolean(issued);

  return (
    <>
      <PageHeader title="Guided Walkthrough" subtitle="Issue → Verify → Revoke → Verify again, in four steps.">
        <EnvTags />
      </PageHeader>

      <div className={`notice ${mode === "live" ? "ok-note" : "warn-note"}`}>
        {mode === "live" ? (
          <>
            <strong>Live mode.</strong> Transactions are signed by your Phantom wallet and written to {NETWORK_NAME}.
          </>
        ) : (
          <>
            <strong>Offline mode.</strong> {reason} The same four steps run locally in your browser, using the same
            SHA-256 hashing. <strong>Nothing is written to any blockchain.</strong>
          </>
        )}
        {canLive && (
          <label className="sim-toggle">
            <input type="checkbox" checked={chooseSim} onChange={(e) => setChooseSim(e.target.checked)} /> Use offline mode instead
          </label>
        )}
      </div>

      {error && (
        <div className="result invalid">
          <strong>{error}</strong>
          {mode === "live" && (
            <div className="actions">
              <button className="secondary" onClick={() => setChooseSim(true)}>Continue in offline mode instead</button>
              {/already issued|already in use/i.test(error) && <button className="secondary" onClick={newRun}>Start a new run</button>}
            </div>
          )}
        </div>
      )}

      <div className="actions demo-bar">
        <button className="primary" onClick={runAll} disabled={busy || locked}>
          {busy ? "Working…" : "▶ Run all 4 steps"}
        </button>
        <button className="secondary" onClick={newRun} disabled={busy}>Reset / new run</button>
      </div>

      <section className="card step">
        <h2><span className="step-n">1</span> Agency A issues a credential</h2>
        <p className="hint">
          The text is hashed with SHA-256 in your browser. Only the hash and the issuer are recorded. The text itself is never sent anywhere.
        </p>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} disabled={locked || busy} />
        <p className="small">Issuer: <span className="mono">{engine.issuerLabel}</span> · hashed text ends with <span className="mono">run:{runId}</span></p>
        <div className="actions">
          <button className="primary" onClick={doIssue} disabled={busy || locked || !text.trim()}>Issue Credential</button>
        </div>
        {issued && <RecordCard rec={issued} heading="Credential issued" live={mode === "live"} />}
      </section>

      <section className="card step">
        <h2><span className="step-n">2</span> Agency B verifies independently</h2>
        <p className="hint">Agency B never contacts Agency A. It only needs the credential text and Agency A’s public key, and reads the proof from {mode === "live" ? NETWORK_NAME : "the simulated ledger"}.</p>
        <div className="actions">
          <button className="primary" onClick={doVerify1} disabled={busy || !issued || Boolean(flow.revoked)}>Verify as Agency B</button>
        </div>
        {flow.verify1 && <Outcome rec={flow.verify1} />}
      </section>

      <section className="card step">
        <h2><span className="step-n">3</span> Agency A revokes the credential</h2>
        <p className="hint">Only the issuer can revoke. The Solana program enforces this{mode === "sim" ? " (in live mode)" : ""}.</p>
        <div className="actions">
          <button className="danger" onClick={() => doRevoke()} disabled={busy || !issued || Boolean(flow.revoked)}>Revoke Credential</button>
        </div>
        {flow.revoked && <RecordCard rec={flow.revoked} heading="Credential revoked" live={mode === "live"} revoked />}
      </section>

      <section className="card step">
        <h2><span className="step-n">4</span> Agency B verifies again</h2>
        <p className="hint">The same check now returns a different answer.</p>
        <div className="actions">
          <button className="primary" onClick={doVerify2} disabled={busy || !flow.revoked}>Verify again</button>
        </div>
        {flow.verify2 && <Outcome rec={flow.verify2} />}
      </section>

      {flow.verify2 && flow.verify2 !== "notfound" && !flow.verify2.isValid && (
        <section className="card privacy">
          <h2>What this showed</h2>
          <ul className="checks">
            <li>Agency B verified a credential without contacting Agency A</li>
            <li>Only a hash and the issuer were recorded, so no personal data was shared</li>
            <li>Revocation by the issuer was visible to Agency B immediately</li>
            {mode === "sim" && <li>This run used offline mode. Connect Phantom with the program deployed to run it on Devnet.</li>}
          </ul>
        </section>
      )}
    </>
  );
}

function RecordCard({ rec, heading, live, revoked }: { rec: DemoRecord; heading: string; live: boolean; revoked?: boolean }) {
  return (
    <div className={`result ${revoked ? "invalid" : "valid"}`}>
      <strong>{heading}.</strong>
      <dl>
        <dt>Credential hash</dt><dd><KeyValue value={rec.hashHex} chars={8} /></dd>
        <dt>{live ? "Credential PDA" : "Local ID"}</dt>
        <dd>{live ? <KeyValue value={rec.ref} /> : <span className="mono">{rec.ref}</span>}</dd>
        {rec.signature && (
          <>
            <dt>Transaction</dt>
            <dd><a href={solscanTx(rec.signature)} target="_blank" rel="noreferrer">View on Solscan ↗</a></dd>
          </>
        )}
        {live && (
          <>
            <dt>Account</dt>
            <dd><a href={solscanAccount(rec.ref)} target="_blank" rel="noreferrer">View on Solscan ↗</a></dd>
          </>
        )}
      </dl>
    </div>
  );
}

function Outcome({ rec }: { rec: DemoRecord | "notfound" }) {
  if (rec === "notfound")
    return (
      <div className="result invalid">
        <StatusBadge status="notfound" /> No credential matches this text and issuer.
      </div>
    );
  return (
    <div className={`result ${rec.isValid ? "valid" : "invalid"}`}>
      <StatusBadge status={rec.isValid ? "valid" : "revoked"} />
      <dl>
        <dt>Issuer</dt><dd className="mono small-wrap">{rec.issuerKey}</dd>
        <dt>Issued</dt><dd>{fmtTime(rec.issuedAt)}</dd>
        <dt>Revoked</dt><dd>{rec.isValid ? "No" : fmtTime(rec.revokedAt)}</dd>
      </dl>
    </div>
  );
}
