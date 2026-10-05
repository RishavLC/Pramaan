import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import StatusPanel from "./components/StatusPanel";
import IssuerView from "./components/IssuerView";
import VerifierView from "./components/VerifierView";
import HistoryView from "./components/HistoryView";

type Tab = "overview" | "issuer" | "verifier" | "history";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Dashboard" },
  { id: "issuer", label: "Agency A · Issuer" },
  { id: "verifier", label: "Agency B · Verifier" },
  { id: "history", label: "Audit Log" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [prefillPda, setPrefillPda] = useState("");
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const goVerify = (pda: string) => {
    setPrefillPda(pda);
    setPrefillNonce((n) => n + 1);
    setTab("verifier");
  };

  return (
    <>
      <div className="flagbar" />
      <header className="top">
        <div className="top-in">
          <div className="brand">
            <div className="seal">TB</div>
            <div>
              <h1>TrustBridge <span className="np">विश्वास सेतु</span></h1>
              <p>Inter-agency credential verification · Prototype</p>
            </div>
          </div>
          <WalletMultiButton />
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="shell">
        {tab === "overview" && <StatusPanel go={setTab} />}
        {tab === "issuer" && <IssuerView onChanged={() => setRefreshKey((k) => k + 1)} onVerify={goVerify} />}
        {tab === "verifier" && <VerifierView prefillPda={prefillPda} prefillNonce={prefillNonce} />}
        {tab === "history" && <HistoryView refreshKey={refreshKey} />}
      </main>

      <footer className="foot">
        Hackathon prototype on Solana devnet. Mock data only. Not an official government system.
      </footer>
    </>
  );
}
