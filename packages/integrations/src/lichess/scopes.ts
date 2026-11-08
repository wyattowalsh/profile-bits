export const LICHESS_SCOPES = [] as const;

export type LichessScope = (typeof LICHESS_SCOPES)[number];
