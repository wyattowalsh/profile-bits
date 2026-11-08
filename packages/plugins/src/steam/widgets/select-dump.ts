/**
 * Steam widgets select from the cached Web API dump.
 * limit stays here. Extra keys MUST NOT fail. No HTTP.
 */

export type SteamPlayer = {
  name: string;
  avatarUrl: string;
};

export type SteamGame = {
  name: string;
  iconUrl: string;
  hours?: number;
};

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function responseOf(
  payload: unknown,
  key: string,
): Record<string, unknown> | null {
  const dump = asDumpRecord(payload);
  const body = asDumpRecord(dump?.[key]);
  return asDumpRecord(body?.response);
}

export function steamPlayer(payload: unknown): SteamPlayer | null {
  const response = responseOf(payload, "GetPlayerSummaries");
  const players = response?.players;
  if (!Array.isArray(players) || players.length === 0) {
    return null;
  }
  const player = asDumpRecord(players[0]);
  if (player == null) {
    return null;
  }
  const name = typeof player.personaname === "string" ? player.personaname : "";
  if (name === "") {
    return null;
  }
  const avatar =
    typeof player.avatarfull === "string"
      ? player.avatarfull
      : typeof player.avatar === "string"
        ? player.avatar
        : "";
  return { name, avatarUrl: avatar };
}

function gameIcon(game: Record<string, unknown>): string {
  const icon = game.img_icon_url;
  if (typeof icon !== "string" || icon === "") {
    return "";
  }
  if (icon.startsWith("https://")) {
    return icon;
  }
  const appid = game.appid;
  if (typeof appid !== "number") {
    return "";
  }
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${icon}.jpg`;
}

export function recentGames(payload: unknown, limit: number): SteamGame[] {
  const response = responseOf(payload, "GetRecentlyPlayedGames");
  const games = response?.games;
  if (!Array.isArray(games)) {
    return [];
  }
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  const rows: SteamGame[] = [];
  for (const item of games) {
    if (rows.length >= cap) {
      break;
    }
    const game = asDumpRecord(item);
    if (game == null || typeof game.name !== "string" || game.name === "") {
      continue;
    }
    const minutes = game.playtime_forever;
    const row: SteamGame = { name: game.name, iconUrl: gameIcon(game) };
    if (
      typeof minutes === "number" &&
      Number.isFinite(minutes) &&
      minutes > 0
    ) {
      row.hours = Math.round((minutes / 60) * 10) / 10;
    }
    rows.push(row);
  }
  return rows;
}

export function recentGameCount(payload: unknown): number {
  const response = responseOf(payload, "GetRecentlyPlayedGames");
  const games = response?.games;
  return Array.isArray(games) ? games.length : 0;
}
