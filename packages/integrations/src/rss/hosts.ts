/**
 * GitHub-owned host matcher. Fail the widget before connect.
 * Hostname is lowercased and trailing dots stripped, then matched
 * against github.com, *.github.com, githubusercontent.com, and
 * *.githubusercontent.com.
 */

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.+$/u, "");
}

export function isGithubOwnedHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return (
    host === "github.com" ||
    host.endsWith(".github.com") ||
    host === "githubusercontent.com" ||
    host.endsWith(".githubusercontent.com")
  );
}
