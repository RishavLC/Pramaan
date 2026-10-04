import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import StatusPanel from "./components/StatusPanel";
import IssuerView from "./components/IssuerView";
import VerifierView from "./components/VerifierView";
import HistoryView from "./components/HistoryView";

type Tab = "overview" | "issuer" | "verifier" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "issuer", label: "Agency A · Issuer" },
  { id: "verifier", label: "Agency B · Verifier" },
  { id: "history", label: "History" },
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
    <div className="shell">
      <header>
        <div>
          <h1>TrustBridge</h1>
          <p className="sub">Verifiable credentials on Solana. Verification without calling the issuer.</p>
        </div>
        <WalletMultiButton />
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <StatusPanel />}
      {tab === "issuer" && <IssuerView onChanged={() => setRefreshKey((k) => k + 1)} onVerify={goVerify} />}
      {tab === "verifier" && <VerifierView prefillPda={prefillPda} prefillNonce={prefillNonce} />}
      {tab === "history" && <HistoryView refreshKey={refreshKey} />}
    </div>
  );
}
