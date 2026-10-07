import { ReactNode, useState } from "react";
import WalletStatus from "./WalletStatus";
import { NETWORK_NAME } from "../lib/config";
import { href } from "../lib/route";

interface NavItem {
  path?: string;
  label: string;
}
const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Overview", items: [{ path: "/", label: "Dashboard" }] },
  {
    section: "Network",
    items: [
      { path: "/agencies", label: "Agencies" },
      { path: "/issue", label: "Issue / Revoke" },
      { path: "/credentials", label: "Credentials" },
      { path: "/verify", label: "Verification" },
    ],
  },
  { section: "Governance", items: [{ label: "Revocations" }, { path: "/audit", label: "Audit Log" }] },
  { section: "System", items: [{ label: "Settings" }] },
];

const sectionOf = (path: string) => path.split("/")[1] ?? "";

interface Props {
  /** First route segment ("" for the dashboard). */
  active: string;
  children: ReactNode;
}

export default function Layout({ active, children }: Props) {
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
                it.path ? (
                  <a
                    key={it.label}
                    href={href(it.path)}
                    className={`nav-item ${active === sectionOf(it.path) ? "active" : ""}`}
                    aria-current={active === sectionOf(it.path) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {it.label}
                  </a>
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
            Prototype · Demo environment on Solana Devnet · Includes clearly labelled demo data · Not an official government system.
          </footer>
        </div>
      </div>
    </div>
  );
}
