import { Program, Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { sha256, toHex } from "./hash";
import { deriveCredentialPda } from "./pda";

export interface CredentialView {
  pda: PublicKey;
  issuer: PublicKey;
  credentialHashHex: string;
  isValid: boolean;
  issuedAt: number;
  revokedAt: number;
}

export interface IssueResult {
  signature: string;
  pda: PublicKey;
  credentialHashHex: string;
}

/** Agency A: hash the text client-side, then anchor only the hash on-chain. */
export async function issueCredential(
  program: Program<Idl>,
  issuer: PublicKey,
  credentialText: string
): Promise<IssueResult> {
  const hash = await sha256(credentialText);
  const pda = deriveCredentialPda(issuer, hash);
  const signature = await program.methods
    .issueCredential(Array.from(hash))
    .accounts({ credential: pda, issuer, systemProgram: SystemProgram.programId })
    .rpc();
  return { signature, pda, credentialHashHex: toHex(hash) };
}

/** Agency B: read the record straight from the chain. Returns null if no such credential. */
export async function fetchCredential(
  program: Program<Idl>,
  pda: PublicKey
): Promise<CredentialView | null> {
  const rec: any = await (program.account as any).credentialRecord.fetchNullable(pda);
  if (!rec) return null;
  return {
    pda,
    issuer: rec.issuer as PublicKey,
    credentialHashHex: toHex(rec.credentialHash as number[]),
    isValid: rec.isValid as boolean,
    issuedAt: Number(rec.issuedAt),
    revokedAt: Number(rec.revokedAt),
  };
}

/** Agency A: revoke. The program rejects any signer other than the original issuer. */
export async function revokeCredential(
  program: Program<Idl>,
  issuer: PublicKey,
  pda: PublicKey
): Promise<string> {
  return program.methods
    .revokeCredential()
    .accounts({ credential: pda, issuer })
    .rpc();
}
