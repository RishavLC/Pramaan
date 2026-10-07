import { ReactNode, useState } from "react";
import { NETWORK_NAME, shorten } from "../lib/config";
import type { AgencyIconKey, AgencyStatus } from "../data/agencies";
import type { CredentialSource, CredentialStatus } from "../lib/registry";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard can be unavailable on non-secure origins */
    }
  }
  return (
    <button type="button" className="btn-quiet" onClick={copy} aria-label={`${label}: ${value}`}>
      {done ? "Copied" : label}
    </button>
  );
}

/** Shortened public value with the full text on hover and a copy button. Public data only. */
export function KeyValue({ value, chars = 5 }: { value: string; chars?: number }) {
  if (!value) return <span className="small">—</span>;
  return (
    <span className="keyval">
      <span className="mono" title={value}>{shorten(value, chars)}</span>
      <CopyButton value={value} />
    </span>
  );
}

const STATUS = {
  valid: { icon: "✓", text: "VALID", cls: "valid" },
  revoked: { icon: "✕", text: "REVOKED", cls: "revoked" },
  notfound: { icon: "?", text: "NOT FOUND", cls: "notfound" },
} as const;

/** Icon + text + colour, so status never relies on colour alone. */
export function StatusBadge({ status }: { status: CredentialStatus | "notfound" }) {
  const s = STATUS[status];
  return (
    <span className={`status-badge ${s.cls}`}>
      <span aria-hidden>{s.icon}</span> ● {s.text}
    </span>
  );
}

export function AgencyStatusBadge({ status }: { status: AgencyStatus }) {
  return status === "active" ? (
    <span className="agency-status ok">● Active</span>
  ) : (
    <span className="agency-status off">○ Offline</span>
  );
}

export function SourceBadge({ source }: { source: CredentialSource }) {
  return source === "onchain" ? (
    <span className="src-badge onchain">On-chain</span>
  ) : (
    <span className="src-badge demo">Demo</span>
  );
}

export function EnvTags({ demoLabel = "Demo Environment" }: { demoLabel?: string }) {
  return (
    <div className="tags">
      <span className="tag">{demoLabel}</span>
      <span className="tag">{NETWORK_NAME}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="page-head">
      {children}
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </section>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-wrap" role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  );
}

const ICONS: Record<AgencyIconKey, string[]> = {
  identity: ["M3 5h18v14H3z", "M8 11a2 2 0 1 0 0.01 0", "M5.5 16c.6-1.4 1.6-2 2.5-2s1.9.6 2.5 2", "M14 9.5h4M14 12.5h4M14 15.5h2.5"],
  municipal: ["M3 21h18", "M5 21V7l7-4 7 4v14", "M9 21v-6h6v6", "M9 10h.01M15 10h.01"],
  transport: ["M4 5h16v11H4z", "M4 11h16", "M7 16v2M17 16v2", "M7.5 13.5h.01M16.5 13.5h.01"],
  social: ["M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z", "M9 12l2 2 4-4"],
  education: ["M2 9l10-5 10 5-10 5z", "M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"],
};

export function AgencyIcon({ icon }: { icon: AgencyIconKey }) {
  return (
    <span className="agency-icon" aria-hidden>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon].map((d, i) => <path key={i} d={d} />)}
      </svg>
    </span>
  );
}

/** Vertical Agency → TrustBridge → Solana → Other agencies diagram, shared by agency detail pages. */
export function TrustRelationship({ agencyName }: { agencyName: string }) {
  const steps: [string, string][] = [
    [agencyName, "issues"],
    ["TrustBridge", "anchors proof"],
    ["Solana (Devnet)", "verifies"],
    ["Other agencies", ""],
  ];
  return (
    <ol className="vflow">
      {steps.map(([label, edge], i) => (
        <li key={label}>
          <div className={`vnode ${i === 1 ? "core" : ""}`}>{label}</div>
          {edge && (
            <div className="vedge" aria-hidden>
              <span>│</span>
              <em>{edge}</em>
              <span>▼</span>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
