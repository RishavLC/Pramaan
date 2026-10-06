import { useSyncExternalStore } from "react";

/**
 * Tiny store so the WalletProvider's onError (main.tsx) can reach the header without extra providers.
 * Only connection problems are surfaced here; signing errors are handled where the transaction is sent.
 */
let current = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function reportWalletError(error: unknown) {
  console.warn("[wallet]", error); // detail for developers only; never shown to users
  const name = error instanceof Error ? error.name : "";
  if (/Sign|Send/.test(name)) return;
  current = true;
  emit();
}

export function clearWalletError() {
  if (!current) return;
  current = false;
  emit();
}

export function useWalletError(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );
}
