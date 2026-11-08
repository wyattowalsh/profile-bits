/**
 * Complete Steam Web API dump. Extra keys stay on each JSON object.
 * The secret is never part of this value.
 */

export type SteamDump = {
  GetPlayerSummaries: Record<string, unknown>;
  GetRecentlyPlayedGames: Record<string, unknown>;
  ResolveVanityURL?: Record<string, unknown>;
};

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function parseSteamDump(raw: {
  GetPlayerSummaries: unknown;
  GetRecentlyPlayedGames: unknown;
  ResolveVanityURL?: unknown;
}): SteamDump | null {
  const summaries = asDumpRecord(raw.GetPlayerSummaries);
  const recent = asDumpRecord(raw.GetRecentlyPlayedGames);
  if (summaries == null || recent == null) {
    return null;
  }
  const vanity = asDumpRecord(raw.ResolveVanityURL);
  if (vanity == null) {
    return {
      GetPlayerSummaries: summaries,
      GetRecentlyPlayedGames: recent,
    };
  }
  return {
    GetPlayerSummaries: summaries,
    GetRecentlyPlayedGames: recent,
    ResolveVanityURL: vanity,
  };
}
