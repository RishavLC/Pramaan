import { useMemo } from "react";
import { Wallet } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram } from "./program";

/** Anchor program bound to the current wallet. Works read-only when no wallet is connected. */
export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(
    () => getProgram(connection, wallet as unknown as Wallet | undefined),
    [connection, wallet]
  );
}

export const fmtTime = (unixSeconds: number) =>
  unixSeconds > 0 ? new Date(unixSeconds * 1000).toLocaleString() : "—";
