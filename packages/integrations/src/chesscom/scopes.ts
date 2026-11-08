/**
 * Destination: packages/integrations/src/chesscom/scopes.ts
 * Public Published Data API. Empty is valid for public REST.
 */
export const CHESSCOM_SCOPES = [] as const;

export type ChesscomScope = (typeof CHESSCOM_SCOPES)[number];
