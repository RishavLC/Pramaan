import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "./config";

export type ProgramStatus = "checking" | "yes" | "no" | "error";

/** Is the Pramaan program deployed (executable) on the connected cluster? */
export function useProgramStatus(): ProgramStatus {
  const { connection } = useConnection();
  const [live, setLive] = useState<ProgramStatus>("checking");
  useEffect(() => {
    let off = false;
    setLive("checking");
    connection
      .getAccountInfo(PROGRAM_ID)
      .then((i) => !off && setLive(i?.executable ? "yes" : "no"))
      .catch(() => !off && setLive("error"));
    return () => {
      off = true;
    };
  }, [connection]);
  return live;
}
