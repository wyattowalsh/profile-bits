/** Yaml user is an identifier, not a fetch URL. */

export const LICHESS_USERNAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;

export function normalizeChessUsername(user: string): string | undefined {
  const trimmed = user.trim();
  if (!LICHESS_USERNAME.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}
