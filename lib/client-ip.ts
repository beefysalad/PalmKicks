import { isIP } from "node:net";

/**
 * Resolve the client IP for rate limiting.
 *
 * Deployment assumption: the app runs behind a platform proxy that sets
 * `x-real-ip` and overwrites/appends `x-forwarded-for` (on Vercel both are set
 * by the edge). A client can put anything at the START of x-forwarded-for, so
 * we never trust the first entry: we take `x-real-ip` when it is a valid IP,
 * otherwise the RIGHT-most valid x-forwarded-for entry (the one appended by
 * the proxy closest to us). If the app is exposed directly without such a
 * proxy, these headers are fully client-controlled.
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim());
    for (let i = parts.length - 1; i >= 0; i--) {
      if (isIP(parts[i])) return parts[i];
    }
  }
  return "unknown";
}
