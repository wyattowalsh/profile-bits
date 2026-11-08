/** Complete lichess dump. Extra keys stay on each JSON object. */

export type LichessDump = {
  user: Record<string, unknown>;
  current: Record<string, unknown>;
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

export function parseLichessDump(raw: {
  user: unknown;
  current: unknown;
  recent: unknown;
}): LichessDump | null {
  const user = asDumpRecord(raw.user);
  if (user == null) {
    return null;
  }
  return {
    user,
    current: asDumpRecord(raw.current) ?? {},
    recent: asDumpRecord(raw.recent) ?? emptyGamesDump(),
  };
}

export function parseNdjsonGames(body: string): Record<string, unknown> {
  const games: unknown[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    games.push(JSON.parse(trimmed) as unknown);
  }
  return { games };
}
