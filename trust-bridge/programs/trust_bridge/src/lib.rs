use anchor_lang::prelude::*;

declare_id!("7q3jwWUepGWzgZuBVTcNffprQJtUGAw9KvjqrvwJNHjk");

/// Seed prefix for every CredentialRecord PDA.
pub const CREDENTIAL_SEED: &[u8] = b"credential";

#[program]
pub mod trust_bridge {
    use super::*;

    /// Agency A: anchor a credential hash on-chain.
    /// PDA = ["credential", issuer, credential_hash], so the same issuer
    /// cannot issue the same hash twice, and a verifier can re-derive the
    /// address from (issuer, hash) without asking anyone.
    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        credential_hash: [u8; 32],
    ) -> Result<()> {
        let record = &mut ctx.accounts.credential;
        let now = Clock::get()?.unix_timestamp;

        record.issuer = ctx.accounts.issuer.key();
        record.credential_hash = credential_hash;
        record.is_valid = true;
        record.issued_at = now;
        record.revoked_at = 0;
        record.bump = ctx.bumps.credential;

        emit!(CredentialIssued {
            credential: record.key(),
            issuer: record.issuer,
            credential_hash,
            issued_at: now,
        });
        Ok(())
    }

    /// Agency B: read-only check. No signer required. Returns the validity
    /// flag plus the issuer so the caller can check it against a whitelist.
    /// Call with `.view()` from the client (simulated, free, no signature).
    pub fn verify_credential(ctx: Context<VerifyCredential>) -> Result<VerificationResult> {
        let record = &ctx.accounts.credential;
        Ok(VerificationResult {
            is_valid: record.is_valid,
            issuer: record.issuer,
            credential_hash: record.credential_hash,
        })
    }

    /// Agency A: revoke. Only the original issuer can sign this.
    pub fn revoke_credential(ctx: Context<RevokeCredential>) -> Result<()> {
        let record = &mut ctx.accounts.credential;
        require!(record.is_valid, TrustBridgeError::AlreadyRevoked);

        let now = Clock::get()?.unix_timestamp;
        record.is_valid = false;
        record.revoked_at = now;

        emit!(CredentialRevoked {
            credential: record.key(),
            issuer: record.issuer,
            revoked_at: now,
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(credential_hash: [u8; 32])]
pub struct IssueCredential<'info> {
    #[account(
        init,
        payer = issuer,
        space = 8 + CredentialRecord::INIT_SPACE,
        seeds = [CREDENTIAL_SEED, issuer.key().as_ref(), credential_hash.as_ref()],
        bump
    )]
    pub credential: Account<'info, CredentialRecord>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyCredential<'info> {
    #[account(
        seeds = [CREDENTIAL_SEED, credential.issuer.as_ref(), credential.credential_hash.as_ref()],
        bump = credential.bump
    )]
    pub credential: Account<'info, CredentialRecord>,
}

#[derive(Accounts)]
pub struct RevokeCredential<'info> {
    #[account(
        mut,
        seeds = [CREDENTIAL_SEED, credential.issuer.as_ref(), credential.credential_hash.as_ref()],
        bump = credential.bump,
        has_one = issuer @ TrustBridgeError::UnauthorizedIssuer
    )]
    pub credential: Account<'info, CredentialRecord>,
    pub issuer: Signer<'info>,
}

/// Only hashes and metadata live on-chain. No personal data.
#[account]
#[derive(InitSpace)]
pub struct CredentialRecord {
    /// Agency that issued (and may revoke) this credential.
    pub issuer: Pubkey,
    /// SHA-256 of the off-chain credential data.
    pub credential_hash: [u8; 32],
    /// False once revoked.
    pub is_valid: bool,
    pub issued_at: i64,
    /// 0 while still valid.
    pub revoked_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerificationResult {
    pub is_valid: bool,
    pub issuer: Pubkey,
    pub credential_hash: [u8; 32],
}

#[event]
pub struct CredentialIssued {
    pub credential: Pubkey,
    pub issuer: Pubkey,
    pub credential_hash: [u8; 32],
    pub issued_at: i64,
}

#[event]
pub struct CredentialRevoked {
    pub credential: Pubkey,
    pub issuer: Pubkey,
    pub revoked_at: i64,
}

#[error_code]
pub enum TrustBridgeError {
    #[msg("Only the original issuer can revoke this credential.")]
    UnauthorizedIssuer,
    #[msg("This credential has already been revoked.")]
    AlreadyRevoked,
}
