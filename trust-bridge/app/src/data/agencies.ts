import { PublicKey } from "@solana/web3.js";

export type AgencyStatus = "active" | "offline";
export type AgencyIconKey = "identity" | "municipal" | "transport" | "social" | "education";

export interface Agency {
  id: string;
  name: string;
  type: string;
  description: string;
  publicKey: string;
  status: AgencyStatus;
  isDemo: boolean;
  icon: AgencyIconKey;
  /** "onchain": stats are counted from real credential records signed by publicKey. "demo": static demo dataset. */
  statsSource: "onchain" | "demo";
}

/**
 * Public key of the demo "Agency A". It defaults to the project's devnet issuer wallet so credentials you
 * issue from that wallet appear under this agency with real numbers. Override with VITE_DEMO_AGENCY_A_PUBKEY.
 * Public keys only: never put a secret key here or in any VITE_ variable.
 */
const DEFAULT_AGENCY_A_KEY = "DJYFvzQrHk2pyRQot5D8a9mARkJop2AhPZFm4F3xRnHx";
const envKey = (import.meta.env.VITE_DEMO_AGENCY_A_PUBKEY as string | undefined)?.trim();
export const AGENCY_A_KEY: string = (() => {
  try {
    return new PublicKey(envKey || DEFAULT_AGENCY_A_KEY).toBase58();
  } catch {
    return DEFAULT_AGENCY_A_KEY;
  }
})();

// Agency metadata is a typed frontend config for the prototype. Replace with on-chain or API data later.
// Keys for the four non-A agencies are generated display-only placeholders, not real wallets.
export const AGENCIES: Agency[] = [
  {
    id: "national-identity",
    name: "National Identity Authority — Demo",
    type: "Identity Services",
    description: "Demo identity issuer. Bound to the project's devnet issuer wallet, so credentials issued from it are counted on-chain.",
    publicKey: AGENCY_A_KEY,
    status: "active",
    isDemo: true,
    icon: "identity",
    statsSource: "onchain",
  },
  {
    id: "municipal",
    name: "Kathmandu Metropolitan Office — Demo",
    type: "Local Government",
    description: "Demo municipal office issuing residence and address credentials.",
    publicKey: "8WYBAzTniXVdxPKaoRMXFqNatnVe4d5389B5HNM4tigh",
    status: "active",
    isDemo: true,
    icon: "municipal",
    statsSource: "demo",
  },
  {
    id: "transport",
    name: "Department of Transport — Demo",
    type: "Transport Services",
    description: "Demo transport department issuing vehicle and licence credentials.",
    publicKey: "DYRZLWxjgVWkZ6GseyMbi6t4tMKmroTvV56sEpmjt1d6",
    status: "active",
    isDemo: true,
    icon: "transport",
    statsSource: "demo",
  },
  {
    id: "social",
    name: "Social Security Authority — Demo",
    type: "Social Protection",
    description: "Demo social protection authority issuing enrollment credentials.",
    publicKey: "Gz81v4jWoKQULkQTK7jnBD5785gkbEktTYeVmDZrJmPf",
    status: "active",
    isDemo: true,
    icon: "social",
    statsSource: "demo",
  },
  {
    id: "education",
    name: "Education Records Office — Demo",
    type: "Education Services",
    description: "Demo education records office issuing certificate credentials. Marked offline in the demo configuration.",
    publicKey: "7pZdXVxnCwBoLJ3gzCZUnCJE49iwCYhmwtQVFjtNs89R",
    status: "offline",
    isDemo: true,
    icon: "education",
    statsSource: "demo",
  },
];

export const getAgency = (id: string) => AGENCIES.find((a) => a.id === id);
export const findAgencyByKey = (key: string) => AGENCIES.find((a) => a.publicKey === key);
