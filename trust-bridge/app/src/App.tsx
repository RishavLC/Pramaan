import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import IssuerView from "./components/IssuerView";
import VerifierView from "./components/VerifierView";
import HistoryView from "./components/HistoryView";
import Agencies from "./pages/Agencies";
import AgencyDetails from "./pages/AgencyDetails";
import Credentials from "./pages/Credentials";
import CredentialDetails from "./pages/CredentialDetails";
import { EmptyState } from "./components/ui";
import { href, navigate, useRoute } from "./lib/route";
import { invalidateRegistry } from "./lib/useRegistry";
import { useState } from "react";

export default function App() {
  const route = useRoute();
  const [refreshKey, setRefreshKey] = useState(0);
  const [first = "", id] = route.segments;

  const onChanged = () => {
    invalidateRegistry(); // issued/revoked: registry must refetch next time it is opened
    setRefreshKey((k) => k + 1);
  };

  let page;
  switch (first) {
    case "":
      page = <Dashboard go={navigate} refreshKey={refreshKey} />;
      break;
    case "issue":
      page = <IssuerView onChanged={onChanged} onVerify={(pda) => navigate(`/verify?pda=${pda}`)} />;
      break;
    case "verify":
      page = <VerifierView prefillPda={route.query.get("pda") ?? ""} />;
      break;
    case "audit":
      page = <HistoryView refreshKey={refreshKey} />;
      break;
    case "agencies":
      page = id ? <AgencyDetails id={id} /> : <Agencies />;
      break;
    case "credentials":
      page = id ? <CredentialDetails id={id} /> : <Credentials />;
      break;
    default:
      page = (
        <div className="card">
          <EmptyState title="Page Not Found" text="This page does not exist." action={<a className="btn-link" href={href("/")}>Back to Dashboard</a>} />
        </div>
      );
  }

  return <Layout active={first}>{page}</Layout>;
}
