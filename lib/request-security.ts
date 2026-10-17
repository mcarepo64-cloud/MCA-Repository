/** Best-effort CSRF origin check for browser-triggered state changes. */
export function hasTrustedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const originUrl = new URL(origin);
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost?.split(",")[0]?.trim() || req.headers.get("host");
    if (!host || originUrl.host.toLowerCase() !== host.toLowerCase()) return false;
    if (process.env.NODE_ENV === "production" && originUrl.protocol !== "https:") return false;
    return true;
  } catch {
    return false;
  }
}
