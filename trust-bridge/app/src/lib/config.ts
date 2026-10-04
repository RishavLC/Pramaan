import { PublicKey, clusterApiUrl } from "@solana/web3.js";
import idl from "../idl/trust_bridge.json";

export const PROGRAM_ID = new PublicKey(idl.address);

const heliusKey = import.meta.env.VITE_HELIUS_API_KEY as string | undefined;
export const HAS_HELIUS = Boolean(heliusKey && heliusKey !== "YOUR_KEY");

/** Helius devnet if a key is set, public devnet otherwise. */
export const RPC_URL = HAS_HELIUS
  ? `https://devnet.helius-rpc.com/?api-key=${heliusKey}`
  : clusterApiUrl("devnet");

export const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`;
export const solscanAccount = (addr: string) =>
  `https://solscan.io/account/${addr}?cluster=devnet`;

export const shorten = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;
