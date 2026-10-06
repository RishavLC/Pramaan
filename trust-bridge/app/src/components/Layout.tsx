import { ReactNode, useState } from "react";
import WalletStatus from "./WalletStatus";
import { NETWORK_NAME } from "../lib/config";

export type Tab = "overview" | "issuer" | "verifier" | "history";

interface NavItem {
  id?: Tab;
  label: string;
}
const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Overview", items: [{ id: "overview", label: "Dashboard" }] },
  {
    section: "Network",
    items: [
      { label: "Agencies" },
      { id: "issuer", label: "Issue / Revoke" },
      { label: "Credentials" },
      { id: "verifier", label: "Verification" },
    ],
  },
  { section: "Governance", items: [{ label: "Revocations" }, { id: "history", label: "Audit Log" }] },
  { section: "System", items: [{ label: "Settings" }] },
];

interface Props {
  tab: Tab;
  onNavigate: (t: Tab) => void;
  children: ReactNode;
}

export default function Layout({ tab, onNavigate, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app">
      <header className="topbar">
        <button className="menu-btn" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          ☰
        </button>
        <div className="brand">
          <div className="seal" aria-hidden>TB</div>
          <div>
            <h1>TrustBridge</h1>
            <p>Nepal Digital Trust Layer</p>
          </div>
        </div>
        <div className="top-right">
          <span className="net-pill"><span className="dot ok-dot" aria-hidden /> {NETWORK_NAME}</span>
          <WalletStatus />
        </div>
      </header>

      <div className="body">
        <nav className={`sidebar ${open ? "open" : ""}`} aria-label="Primary">
          {NAV.map((g) => (
            <div key={g.section} className="nav-group">
              <div className="nav-title">{g.section}</div>
              {g.items.map((it) =>
                it.id ? (
                  <button
                    key={it.label}
                    className={`nav-item ${tab === it.id ? "active" : ""}`}
                    aria-current={tab === it.id ? "page" : undefined}
                    onClick={() => {
                      onNavigate(it.id!);
                      setOpen(false);
                    }}
                  >
                    {it.label}
                  </button>
                ) : (
                  <button key={it.label} className="nav-item" disabled title="Planned for a later phase">
                    {it.label} <small>Soon</small>
                  </button>
                )
              )}
            </div>
          ))}
        </nav>

        <div className="content">
          <main className="shell">{children}</main>
          <footer className="foot">
            Prototype · Demo environment on Solana Devnet · Mock data only · Not an official government system.
          </footer>
        </div>
      </div>
    </div>
  );
}
