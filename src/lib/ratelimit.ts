import "server-only";

// Best-effort, in-memory (per server instance). Good enough to slow guessing;
// swap for a shared store (e.g. Upstash) if you need a hard guarantee on Vercel.
const WINDOW = 15 * 60 * 1000;
const MAX = 8;
const hits = new Map<string, { n: number; reset: number }>();

export function tooMany(key: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  return !!h && h.reset > now && h.n >= MAX;
}

export function recordFailure(key: string) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) hits.set(key, { n: 1, reset: now + WINDOW });
  else h.n++;
}

export function clearFailures(key: string) {
  hits.delete(key);
}
