import { CredentialView } from "./credentials";
import { AGENCIES, Agency, findAgencyByKey } from "../data/agencies";
import { DEMO_CREDENTIALS } from "../data/demoCredentials";

export type CredentialStatus = "valid" | "revoked";
export type CredentialSource = "onchain" | "demo";

export interface TimelineEvent {
  kind: "issued" | "verified" | "revoked";
  at: number; // unix seconds
  demo: boolean;
}

/** UI model. Blockchain data (CredentialView) is mapped into this; it is never sent back to the chain. */
export interface RegistryEntry {
  id: string; // route id: PDA for on-chain, TB-DEMO-xxx for demo
  displayId: string;
  source: CredentialSource;
  type: string;
  issuerKey: string;
  issuerName: string;
  agencyId: string | null;
  status: CredentialStatus;
  hashHex: string;
  pda: string | null;
  issuedAt: number;
  revokedAt: number | null;
  events: TimelineEvent[];
  sampleText: string | null;
}

export const UNKNOWN_TYPE = "Unspecified (kept off-chain)";

export function fromChain(v: CredentialView): RegistryEntry {
  const issuerKey = v.issuer.toBase58();
  const agency = findAgencyByKey(issuerKey);
  const revokedAt = !v.isValid && v.revokedAt > 0 ? v.revokedAt : null;
  const events: TimelineEvent[] = [{ kind: "issued", at: v.issuedAt, demo: false }];
  if (revokedAt) events.push({ kind: "revoked", at: revokedAt, demo: false });
  return {
    id: v.pda.toBase58(),
    displayId: `TB-${v.credentialHashHex.slice(0, 8).toUpperCase()}`,
    source: "onchain",
    type: UNKNOWN_TYPE, // the program stores only a hash, never the credential type
    issuerKey,
    issuerName: agency?.name ?? "Unregistered issuer",
    agencyId: agency?.id ?? null,
    status: v.isValid ? "valid" : "revoked",
    hashHex: v.credentialHashHex,
    pda: v.pda.toBase58(),
    issuedAt: v.issuedAt,
    revokedAt,
    events,
    sampleText: null,
  };
}

export function demoEntries(): RegistryEntry[] {
  return DEMO_CREDENTIALS.map((d): RegistryEntry => {
    const agency = AGENCIES.find((a) => a.id === d.agencyId);
    const events: TimelineEvent[] = [
      { kind: "issued", at: d.issuedAt, demo: true },
      ...d.verifiedAt.map((at) => ({ kind: "verified" as const, at, demo: true })),
      ...(d.revokedAt ? [{ kind: "revoked" as const, at: d.revokedAt, demo: true }] : []),
    ].sort((a, b) => a.at - b.at);
    return {
      id: d.id,
      displayId: d.id,
      source: "demo",
      type: d.type,
      issuerKey: agency?.publicKey ?? "",
      issuerName: agency?.name ?? "Demo issuer",
      agencyId: d.agencyId,
      status: d.revokedAt ? "revoked" : "valid",
      hashHex: d.hashHex,
      pda: null,
      issuedAt: d.issuedAt,
      revokedAt: d.revokedAt,
      events,
      sampleText: d.sampleText,
    };
  });
}

export function mergeEntries(chain: CredentialView[]): RegistryEntry[] {
  return [...chain.map(fromChain), ...demoEntries()];
}

export interface AgencyStats {
  issued: number;
  verified: number | null; // null = not recorded on-chain
  revoked: number;
  lastActivity: number | null;
  source: CredentialSource;
}

export function agencyStats(agency: Agency, entries: RegistryEntry[]): AgencyStats {
  if (agency.statsSource === "onchain") {
    const mine = entries.filter((e) => e.source === "onchain" && e.issuerKey === agency.publicKey);
    const times = mine.flatMap((e) => [e.issuedAt, e.revokedAt ?? 0]);
    return {
      issued: mine.length,
      verified: null,
      revoked: mine.filter((e) => e.status === "revoked").length,
      lastActivity: times.length ? Math.max(...times) : null,
      source: "onchain",
    };
  }
  const mine = entries.filter((e) => e.source === "demo" && e.agencyId === agency.id);
  const times = mine.flatMap((e) => e.events.map((ev) => ev.at));
  return {
    issued: mine.length,
    verified: mine.reduce((n, e) => n + e.events.filter((ev) => ev.kind === "verified").length, 0),
    revoked: mine.filter((e) => e.status === "revoked").length,
    lastActivity: times.length ? Math.max(...times) : null,
    source: "demo",
  };
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});
export const fmtDay = (unix: number | null) => (unix ? dayFmt.format(new Date(unix * 1000)) : "—");
export const fmtDateTime = (unix: number | null) => (unix ? dateTimeFmt.format(new Date(unix * 1000)) : "—");
