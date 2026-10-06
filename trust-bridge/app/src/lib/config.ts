import { PublicKey, clusterApiUrl } from "@solana/web3.js";
import idl from "../idl/trust_bridge.json";

/**
 * Single source of truth for the program ID is the IDL (`idl.address`), which Anchor itself uses.
 * `anchor build` + `npm run sync-idl` keep it equal to declare_id! and Anchor.toml.
 */
export const PROGRAM_ID = new PublicKey(idl.address);

/** Optional sanity check: VITE_PROGRAM_ID must match the IDL if it is set. */
const envProgramId = (import.meta.env.VITE_PROGRAM_ID as string | undefined)?.trim();
export const PROGRAM_ID_MISMATCH = Boolean(envProgramId && envProgramId !== PROGRAM_ID.toBase58());

const isSet = (v: string | undefined): v is string => Boolean(v && v.trim() && v.trim() !== "YOUR_KEY");

const explicitRpc = import.meta.env.VITE_SOLANA_RPC_URL as string | undefined;
const heliusKey = import.meta.env.VITE_HELIUS_API_KEY as string | undefined;

export const HAS_HELIUS = !isSet(explicitRpc) && isSet(heliusKey);

/** Priority: VITE_SOLANA_RPC_URL > Helius devnet (VITE_HELIUS_API_KEY) > public devnet. */
export const RPC_URL: string = isSet(explicitRpc)
  ? explicitRpc.trim()
  : HAS_HELIUS
    ? `https://devnet.helius-rpc.com/?api-key=${heliusKey!.trim()}`
    : clusterApiUrl("devnet");

export const RPC_LABEL = isSet(explicitRpc) ? "Custom RPC" : HAS_HELIUS ? "Helius RPC" : "Public devnet RPC";
export const NETWORK_NAME = "Solana Devnet";

export const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`;
export const solscanAccount = (addr: string) =>
  `https://solscan.io/account/${addr}?cluster=devnet`;

export const shorten = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;
