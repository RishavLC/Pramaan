import { getAgency } from "../data/agencies";
import { NETWORK_NAME } from "../lib/config";
import { agencyStats, fmtDateTime } from "../lib/registry";
import { href } from "../lib/route";
import { useRegistry } from "../lib/useRegistry";
import { AgencyIcon, AgencyStatusBadge, CopyButton, EmptyState, SourceBadge, StatusBadge, TrustRelationship } from "../components/ui";

export default function AgencyDetails({ id }: { id: string }) {
  const agency = getAgency(id);
  const { entries, loading } = useRegistry();

  if (!agency) {
    return (
      <div className="card">
        <EmptyState
          title="Agency Not Found"
          text="This agency is not part of the demo network."
          action={<a className="btn-link" href={href("/agencies")}>Back to Agency Network</a>}
        />
      </div>
    );
  }

  const st = agencyStats(agency, entries);
  const issued = entries.filter((e) => (agency.statsSource === "onchain" ? e.source === "onchain" && e.issuerKey === agency.publicKey : e.source === "demo" && e.agencyId === agency.id));

  return (
    <>
      <p className="crumbs"><a href={href("/agencies")}>Agency Network</a> / {agency.name}</p>
      <section className="card detail-head">
        <AgencyIcon icon={agency.icon} />
        <div>
          <div className="tags"><span className="tag">Demo Organization</span><span className="tag">{NETWORK_NAME}</span></div>
          <h2>{agency.name}</h2>
          <p className="hint">{agency.description}</p>
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Agency Details</h2>
          <dl className="kv">
            <dt>Status</dt><dd><AgencyStatusBadge status={agency.status} /></dd>
            <dt>Agency Type</dt><dd>{agency.type}</dd>
            <dt>Public Key</dt>
            <dd>
              <span className="mono small-wrap">{agency.publicKey}</span> <CopyButton value={agency.publicKey} />
            </dd>
            <dt>Network</dt><dd>{NETWORK_NAME}</dd>
            <dt>Issued</dt><dd>{st.issued}</dd>
            <dt>Verified</dt><dd>{st.verified ?? "Not recorded on-chain"}</dd>
            <dt>Revoked</dt><dd>{st.revoked}</dd>
            <dt>Last Activity</dt><dd>{fmtDateTime(st.lastActivity)}</dd>
          </dl>
          <p className="small">
            {st.source === "onchain"
              ? "Counts come from real credential records signed by this key on Solana Devnet. Verification reads are not recorded on-chain."
              : "Demo statistics, derived from the fictional demo credentials. Not blockchain data."}
          </p>
        </section>

        <section className="card">
          <h2>Trust Relationship</h2>
          <TrustRelationship agencyName={agency.name} />
        </section>
      </div>

      <section className="card">
        <h2>Credentials issued by this agency</h2>
        {loading && issued.length === 0 ? (
          <p className="hint">Loading credentials…</p>
        ) : issued.length === 0 ? (
          <p className="hint">No credentials found for this agency{agency.statsSource === "onchain" ? " on Devnet yet. Issue one from the Issue / Revoke page." : "."}</p>
        ) : (
          <ul className="activity">
            {issued.slice(0, 6).map((e) => (
              <li key={e.id}>
                <StatusBadge status={e.status} />
                <div>
                  <a href={href(`/credentials/${e.id}`)}><b>{e.displayId}</b></a>
                  <div className="small">{e.type}</div>
                </div>
                <SourceBadge source={e.source} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
