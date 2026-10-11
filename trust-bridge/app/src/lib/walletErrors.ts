import { useSyncExternalStore } from "react";

/**
 * Tiny store so wallet failures can reach the header without extra providers.
 * Holds technical detail text (for the "details" fold-out) or null when there is no error.
 * Only connection problems are surfaced; signing errors are handled where the transaction is sent.
 */
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Console only. Used for background errors (e.g. silent reconnect) that users should not see. */
export function logWalletError(error: unknown) {
  console.warn("[wallet]", error);
}

function detailOf(error: unknown): string {
  const e = error as { name?: string; message?: string; error?: { message?: string; code?: number } };
  return [e?.name, e?.message, e?.error?.message, e?.error?.code].filter((x) => x !== undefined && x !== "").join(" · ");
}

/** Log and show the friendly "Unable to connect Phantom" box. Used when the user clicked Connect. */
export function reportWalletError(error: unknown) {
  logWalletError(error);
  const name = error instanceof Error ? error.name : "";
  if (/Sign|Send/.test(name)) return;
  current = detailOf(error) || "No details available";
  emit();
}

export function clearWalletError() {
  if (current === null) return;
  current = null;
  emit();
}

export function useWalletError(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );
}
