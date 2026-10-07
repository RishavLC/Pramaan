import { useMemo, useSyncExternalStore } from "react";

/**
 * Minimal hash router (#/agencies/:id). The project had no router, and a hash router gives real, shareable
 * URLs and a working back button without adding a dependency or needing server rewrites.
 */
export interface Route {
  segments: string[];
  query: URLSearchParams;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const snapshot = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, snapshot);
  return useMemo(() => {
    const raw = hash.replace(/^#/, "");
    const [path, qs = ""] = raw.split("?");
    return {
      segments: path.split("/").filter(Boolean).map(decodeURIComponent),
      query: new URLSearchParams(qs),
    };
  }, [hash]);
}

export function navigate(to: string) {
  window.location.hash = to;
  window.scrollTo({ top: 0 });
}

export const href = (to: string) => `#${to}`;
