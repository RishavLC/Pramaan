/** Turns wallet / Anchor / RPC errors into messages a non-developer can act on. */
export function explainError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/User rejected|rejected the request|declined/i.test(msg))
    return "Transaction cancelled in your wallet.";
  if (/UnauthorizedIssuer|0x1770|ConstraintHasOne/i.test(msg))
    return "Only the wallet that issued this credential can revoke it.";
  if (/AlreadyRevoked|0x1771/i.test(msg)) return "This credential is already revoked.";
  if (/already in use/i.test(msg))
    return "This exact credential was already issued by this wallet. Change the text or use another wallet.";
  if (/insufficient (funds|lamports)|no record of a prior credit/i.test(msg))
    return "Not enough devnet SOL in this wallet. Get some at faucet.solana.com.";
  if (/AccountNotInitialized|3012|Account does not exist/i.test(msg))
    return "No credential exists at that address.";
  if (/Invalid public key|Non-base58/i.test(msg)) return "That is not a valid Solana address.";
  return msg;
}
