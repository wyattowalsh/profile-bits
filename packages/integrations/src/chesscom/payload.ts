/** Complete chess.com dump. Extra keys stay on each JSON object. */

export type ChesscomDump = {
  player: Record<string, unknown>;
  stats: Record<string, unknown>;
  current: Record<string, unknown>;
  archives: Record<string, unknown>;
  recent: Record<string, unknown>;
};

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function emptyGamesDump(): Record<string, unknown> {
  return { games: [] };
}

export function emptyArchivesDump(): Record<string, unknown> {
  return { archives: [] };
}

export function parseChesscomDump(raw: {
  player: unknown;
  stats: unknown;
  current: unknown;
  archives: unknown;
  recent: unknown;
}): ChesscomDump | null {
  const player = asDumpRecord(raw.player);
  const stats = asDumpRecord(raw.stats);
  if (player == null || stats == null) {
    return null;
  }
  return {
    player,
    stats,
    current: asDumpRecord(raw.current) ?? emptyGamesDump(),
    archives: asDumpRecord(raw.archives) ?? emptyArchivesDump(),
    recent: asDumpRecord(raw.recent) ?? emptyGamesDump(),
  };
}
