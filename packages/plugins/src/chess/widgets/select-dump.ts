/**
 * Chess widgets select from a cached chess.com or lichess dump.
 * Extra keys MUST NOT fail. Widgets MUST NOT perform HTTP.
 */

const FEN_TAG = /\[FEN\s+"([^"]+)"\]/;

const CHESSCOM_CLASSES = [
  ["chess_bullet", "Bullet"],
  ["chess_blitz", "Blitz"],
  ["chess_rapid", "Rapid"],
  ["chess_daily", "Daily"],
  ["tactics", "Puzzle"],
] as const;

const LICHESS_PERFS = [
  ["bullet", "Bullet"],
  ["blitz", "Blitz"],
  ["rapid", "Rapid"],
  ["classical", "Classical"],
  ["puzzle", "Puzzle"],
] as const;

export type RatingChip = {
  label: string;
  value: number;
};

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function dumpBody(payload: unknown): Record<string, unknown> | null {
  const record = asDumpRecord(payload);
  if (record == null) {
    return null;
  }
  return asDumpRecord(record.dump) ?? record;
}

function sourceOf(payload: unknown): string {
  const record = asDumpRecord(payload);
  return typeof record?.source === "string" ? record.source : "";
}

function finiteRating(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function ratingFromClass(node: unknown): number | undefined {
  const record = asDumpRecord(node);
  if (record == null) {
    return undefined;
  }
  const last = asDumpRecord(record.last);
  const highest = asDumpRecord(record.highest);
  return (
    finiteRating(last?.rating) ??
    finiteRating(highest?.rating) ??
    finiteRating(record.rating)
  );
}

export function ratingChips(payload: unknown): RatingChip[] {
  const dump = dumpBody(payload);
  if (dump == null) {
    return [];
  }
  const source = sourceOf(payload);
  const user = asDumpRecord(dump.user);
  const perfs = asDumpRecord(user?.perfs) ?? asDumpRecord(dump.perfs);
  if (source === "lichess" || (source !== "chesscom" && perfs != null)) {
    return chipsFromMap(perfs, LICHESS_PERFS);
  }
  const stats = asDumpRecord(dump.stats) ?? dump;
  return chipsFromMap(stats, CHESSCOM_CLASSES);
}

function chipsFromMap(
  record: Record<string, unknown> | null,
  classes: readonly (readonly [string, string])[],
): RatingChip[] {
  if (record == null) {
    return [];
  }
  const chips: RatingChip[] = [];
  for (const [key, label] of classes) {
    const value = ratingFromClass(record[key]);
    if (value === undefined) {
      continue;
    }
    chips.push({ label, value });
  }
  return chips;
}

function fenFromRecord(record: Record<string, unknown>): string | undefined {
  if (typeof record.fen === "string" && record.fen !== "") {
    return record.fen;
  }
  if (typeof record.lastFen === "string" && record.lastFen !== "") {
    return record.lastFen;
  }
  if (typeof record.pgn === "string") {
    const match = FEN_TAG.exec(record.pgn);
    const tagged = match?.[1];
    if (tagged != null && tagged !== "") {
      return tagged;
    }
  }
  return undefined;
}

function fenFromNode(value: unknown): string | undefined {
  const record = asDumpRecord(value);
  if (record == null) {
    return undefined;
  }
  const direct = fenFromRecord(record);
  if (direct !== undefined) {
    return direct;
  }
  const games = record.games;
  if (!Array.isArray(games)) {
    return undefined;
  }
  for (const game of games) {
    const gameRecord = asDumpRecord(game);
    if (gameRecord == null) {
      continue;
    }
    const fen = fenFromRecord(gameRecord);
    if (fen !== undefined) {
      return fen;
    }
  }
  return undefined;
}

export function gameFen(payload: unknown): string | undefined {
  const dump = dumpBody(payload);
  if (dump == null) {
    return undefined;
  }
  return (
    fenFromNode(dump.current) ?? fenFromNode(dump.recent) ?? fenFromNode(dump)
  );
}

function nameFrom(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  const record = asDumpRecord(value);
  if (record == null) {
    return "";
  }
  if (typeof record.username === "string") {
    return record.username;
  }
  if (typeof record.name === "string") {
    return record.name;
  }
  return "";
}

export function gameNames(payload: unknown): string {
  const dump = dumpBody(payload);
  if (dump == null) {
    return "";
  }
  const nodes = [dump.current, dump.recent, dump];
  for (const node of nodes) {
    const record = asDumpRecord(node);
    if (record == null) {
      continue;
    }
    const games = Array.isArray(record.games) ? record.games : [record];
    for (const game of games) {
      const gameRecord = asDumpRecord(game);
      if (gameRecord == null) {
        continue;
      }
      const white = nameFrom(gameRecord.white);
      const black = nameFrom(gameRecord.black);
      if (white !== "" && black !== "") {
        return `${white} vs ${black}`;
      }
      if (white !== "" || black !== "") {
        return white !== "" ? white : black;
      }
    }
  }
  return "";
}
