import { useState } from "react";
import Layout, { Tab } from "./components/Layout";
import Dashboard from "./components/Dashboard";
import IssuerView from "./components/IssuerView";
import VerifierView from "./components/VerifierView";
import HistoryView from "./components/HistoryView";

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
    <Layout tab={tab} onNavigate={setTab}>
      {tab === "overview" && <Dashboard go={setTab} refreshKey={refreshKey} />}
      {tab === "issuer" && <IssuerView onChanged={() => setRefreshKey((k) => k + 1)} onVerify={goVerify} />}
      {tab === "verifier" && <VerifierView prefillPda={prefillPda} prefillNonce={prefillNonce} />}
      {tab === "history" && <HistoryView refreshKey={refreshKey} />}
    </Layout>
  );
}
