/**
 * A same-site path to continue to after signing in, or "/". Browsers read "/\evil.com" and
 * "/<tab>/evil.com" like "//evil.com" (another site), so the value is parsed as a URL and must stay
 * on this origin.
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  try {
    const base = "http://same.origin";
    const url = new URL(next, base);
    return url.origin === base ? url.pathname + url.search + url.hash : "/";
  } catch {
    return "/";
  }
}
