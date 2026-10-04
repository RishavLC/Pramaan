/**
 * End-to-end check against the DEPLOYED devnet program via Helius:
 * issue -> verify -> revoke -> verify, printing Solscan links.
 * Usage: npm run smoke:devnet
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { createHash } from "crypto";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as os from "os";
import idl from "../target/idl/trust_bridge.json";
import { TrustBridge } from "../target/types/trust_bridge";

dotenv.config();

const apiKey = process.env.HELIUS_API_KEY;
if (!apiKey) throw new Error("Set HELIUS_API_KEY in .env");

const walletPath = (process.env.ANCHOR_WALLET ?? "/home/rishav/.config/solana/trustbridge-devnet.json").replace(
  /^~/,
  os.homedir()
);
const secret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));

const connection = new Connection(
  `https://devnet.helius-rpc.com/?api-key=${apiKey}`,
  "confirmed"
);
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), {
  commitment: "confirmed",
});
anchor.setProvider(provider);
const program = new Program<TrustBridge>(idl as TrustBridge, provider);

const tx = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`;
const hash = (s: string) => Array.from(createHash("sha256").update(s, "utf8").digest());

async function main() {
  console.log("Program :", program.programId.toBase58());
  console.log("Issuer  :", keypair.publicKey.toBase58());

  const info = await connection.getAccountInfo(program.programId);
  if (!info?.executable) {
    throw new Error("Program not found on devnet. Run ./scripts/deploy-devnet.sh first.");
  }

  // Unique text each run so the PDA never collides with an earlier run.
  const text = `Rishav Shrestha, Kathmandu-10, verified 2026-10-02 [smoke ${Date.now()}]`;
  const h = hash(text);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("credential"), keypair.publicKey.toBuffer(), Buffer.from(h)],
    program.programId
  );
  console.log("Credential PDA:", pda.toBase58());

  const issueSig = await program.methods
    .issueCredential(h)
    .accounts({
      credential: pda,
      issuer: keypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("1. Issued   ", tx(issueSig));

  const v1 = await program.methods.verifyCredential().accounts({ credential: pda }).view();
  console.log(`2. Verify    valid=${v1.isValid} issuer=${v1.issuer.toBase58()}`);
  if (!v1.isValid) throw new Error("Expected valid credential");

  const revokeSig = await program.methods
    .revokeCredential()
    .accounts({ credential: pda, issuer: keypair.publicKey })
    .rpc();
  console.log("3. Revoked  ", tx(revokeSig));

  const v2 = await program.methods.verifyCredential().accounts({ credential: pda }).view();
  console.log(`4. Verify    valid=${v2.isValid}`);
  if (v2.isValid) throw new Error("Expected revoked credential");

  console.log("\nSmoke test passed on devnet.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
