import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./config";

/** Must match the seeds in the Anchor program: ["credential", issuer, credential_hash]. */
export function deriveCredentialPda(issuer: PublicKey, credentialHash: Uint8Array): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credential"), issuer.toBuffer(), Buffer.from(credentialHash)],
    PROGRAM_ID
  )[0];
}
