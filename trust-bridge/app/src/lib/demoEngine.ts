import { Program, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { fetchCredential, issueCredential, revokeCredential, CredentialView } from "./credentials";
import { sha256, toHex } from "./hash";
import { deriveCredentialPda } from "./pda";

/** One credential as the demo flow sees it, whether it lives on Solana or in the local simulation. */
export interface DemoRecord {
  ref: string; // PDA (live) or SIM-… id (simulation)
  issuerKey: string;
  hashHex: string;
  isValid: boolean;
  issuedAt: number;
  revokedAt: number;
  signature: string | null; // null in simulation
}

export interface DemoEngine {
  mode: "live" | "sim";
  issuerLabel: string;
  issue(text: string): Promise<DemoRecord>;
  /** Agency B: rebuilds the lookup key from the credential text + issuer only. Returns null if nothing is found. */
  verify(text: string): Promise<DemoRecord | null>;
  revoke(ref: string): Promise<DemoRecord>;
}

const nowSec = () => Math.floor(Date.now() / 1000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fromView(v: CredentialView, signature: string | null): DemoRecord {
  return {
    ref: v.pda.toBase58(),
    issuerKey: v.issuer.toBase58(),
    hashHex: v.credentialHashHex,
    isValid: v.isValid,
    issuedAt: v.issuedAt,
    revokedAt: v.revokedAt,
    signature,
  };
}

/** Real engine: signs with the connected Phantom wallet and writes to Solana Devnet through the existing helpers. */
export function liveEngine(program: Program<Idl>, issuer: PublicKey): DemoEngine {
  return {
    mode: "live",
    issuerLabel: issuer.toBase58(),
    async issue(text) {
      const res = await issueCredential(program, issuer, text);
      const view = await fetchCredential(program, res.pda).catch(() => null);
      return view
        ? fromView(view, res.signature)
        : { ref: res.pda.toBase58(), issuerKey: issuer.toBase58(), hashHex: res.credentialHashHex, isValid: true, issuedAt: nowSec(), revokedAt: 0, signature: res.signature };
    },
    async verify(text) {
      const hash = await sha256(text);
      const view = await fetchCredential(program, deriveCredentialPda(issuer, hash));
      return view ? fromView(view, null) : null;
    },
    async revoke(ref) {
      const pda = new PublicKey(ref);
      const sig = await revokeCredential(program, issuer, pda);
      const view = await fetchCredential(program, pda);
      if (!view) throw new Error("Credential not found after revoke");
      return fromView(view, sig);
    },
  };
}

// Simulation: in-memory only. Nothing is written to any blockchain.
const SIM_ISSUER = "Simulated Agency A";
const simStore = new Map<string, DemoRecord>();
const simRef = (hashHex: string) => `SIM-${hashHex.slice(0, 16)}`;

export const simEngine: DemoEngine = {
  mode: "sim",
  issuerLabel: SIM_ISSUER,
  async issue(text) {
    await sleep(500);
    const hashHex = toHex(await sha256(text));
    const ref = simRef(hashHex);
    if (simStore.has(ref)) throw new Error("already in use");
    const rec: DemoRecord = { ref, issuerKey: SIM_ISSUER, hashHex, isValid: true, issuedAt: nowSec(), revokedAt: 0, signature: null };
    simStore.set(ref, rec);
    return { ...rec };
  },
  async verify(text) {
    await sleep(400);
    const rec = simStore.get(simRef(toHex(await sha256(text))));
    return rec ? { ...rec } : null;
  },
  async revoke(ref) {
    await sleep(500);
    const rec = simStore.get(ref);
    if (!rec) throw new Error("Account does not exist");
    rec.isValid = false;
    rec.revokedAt = nowSec();
    return { ...rec };
  },
};
