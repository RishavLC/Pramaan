import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createHash } from "crypto";
import { assert } from "chai";
import { TrustBridge } from "../target/types/trust_bridge";

describe("trust_bridge", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TrustBridge as Program<TrustBridge>;

  const issuer = provider.wallet as anchor.Wallet; // Agency A
  const attacker = Keypair.generate(); // an unrelated signer

  const credentialText = "Rishav Shrestha, Kathmandu-10, verified 2026-10-02";
  const hash = (s: string): number[] =>
    Array.from(createHash("sha256").update(s, "utf8").digest());

  const credentialHash = hash(credentialText);

  const derivePda = (issuerKey: PublicKey, h: number[]): PublicKey =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), issuerKey.toBuffer(), Buffer.from(h)],
      program.programId
    )[0];

  const credentialPda = derivePda(issuer.publicKey, credentialHash);

  async function expectError(promise: Promise<unknown>, code: string) {
    try {
      await promise;
    } catch (e: any) {
      const actual = e?.error?.errorCode?.code ?? e?.message ?? String(e);
      assert.include(String(actual), code, `expected ${code}, got ${actual}`);
      return;
    }
    assert.fail(`expected error ${code} but the call succeeded`);
  }

  before(async () => {
    const sig = await provider.connection.requestAirdrop(
      attacker.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({ signature: sig, ...latest });
  });

  it("issues a credential", async () => {
    const sig = await program.methods
      .issueCredential(credentialHash)
      .accounts({
        credential: credentialPda,
        issuer: issuer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    assert.isString(sig);

    const record = await program.account.credentialRecord.fetch(credentialPda);
    assert.equal(record.issuer.toBase58(), issuer.publicKey.toBase58());
    assert.deepEqual(Array.from(record.credentialHash), credentialHash);
    assert.isTrue(record.isValid);
    assert.equal(record.revokedAt.toNumber(), 0);
    assert.isAbove(record.issuedAt.toNumber(), 0);
  });

  it("rejects issuing the same credential twice", async () => {
    let failed = false;
    try {
      await program.methods
        .issueCredential(credentialHash)
        .accounts({
          credential: credentialPda,
          issuer: issuer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch {
      failed = true; // account already in use
    }
    assert.isTrue(failed, "duplicate issue should fail");
  });

  it("verifies a valid credential without the issuer signing", async () => {
    const result = await program.methods
      .verifyCredential()
      .accounts({ credential: credentialPda })
      .view();

    assert.isTrue(result.isValid);
    assert.equal(result.issuer.toBase58(), issuer.publicKey.toBase58());
    assert.deepEqual(Array.from(result.credentialHash), credentialHash);
  });

  it("verifier can re-derive the PDA from the credential text + issuer", async () => {
    const rederived = derivePda(issuer.publicKey, hash(credentialText));
    assert.equal(rederived.toBase58(), credentialPda.toBase58());
  });

  it("blocks a non-issuer from revoking", async () => {
    await expectError(
      program.methods
        .revokeCredential()
        .accounts({ credential: credentialPda, issuer: attacker.publicKey })
        .signers([attacker])
        .rpc(),
      "UnauthorizedIssuer"
    );

    const record = await program.account.credentialRecord.fetch(credentialPda);
    assert.isTrue(record.isValid, "credential must remain valid");
  });

  it("lets the issuer revoke", async () => {
    await program.methods
      .revokeCredential()
      .accounts({ credential: credentialPda, issuer: issuer.publicKey })
      .rpc();

    const record = await program.account.credentialRecord.fetch(credentialPda);
    assert.isFalse(record.isValid);
    assert.isAbove(record.revokedAt.toNumber(), 0);
  });

  it("verify returns invalid after revocation", async () => {
    const result = await program.methods
      .verifyCredential()
      .accounts({ credential: credentialPda })
      .view();
    assert.isFalse(result.isValid);
    assert.equal(result.issuer.toBase58(), issuer.publicKey.toBase58());
  });

  it("rejects revoking twice", async () => {
    await expectError(
      program.methods
        .revokeCredential()
        .accounts({ credential: credentialPda, issuer: issuer.publicKey })
        .rpc(),
      "AlreadyRevoked"
    );
  });

  it("different issuers can anchor the same hash independently", async () => {
    const otherPda = derivePda(attacker.publicKey, credentialHash);
    await program.methods
      .issueCredential(credentialHash)
      .accounts({
        credential: otherPda,
        issuer: attacker.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([attacker])
      .rpc();

    const record = await program.account.credentialRecord.fetch(otherPda);
    assert.equal(record.issuer.toBase58(), attacker.publicKey.toBase58());
    assert.isTrue(record.isValid);
  });
});
