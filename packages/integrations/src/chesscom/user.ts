/** Yaml user is an identifier, not a fetch URL. */

export const CHESSCOM_USERNAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;

export function normalizeChessUsername(user: string): string | undefined {
  const trimmed = user.trim();
  if (!CHESSCOM_USERNAME.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}
