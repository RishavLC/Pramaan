import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "../idl/trust_bridge.json";

// Verification only reads accounts, so it works with no wallet connected.
const readOnlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T,>(tx: T) => tx,
  signAllTransactions: async <T,>(txs: T[]) => txs,
} as unknown as Wallet;

export function getProgram(connection: Connection, wallet?: Wallet): Program<Idl> {
  const provider = new AnchorProvider(connection, wallet ?? readOnlyWallet, {
    commitment: "confirmed",
  });
  return new Program(idl as Idl, provider);
}
