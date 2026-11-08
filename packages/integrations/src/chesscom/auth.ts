/**
 * Destination: packages/integrations/src/chesscom/auth.ts
 * Scheme none. No Authorization. Assert is a no-op.
 */
import type { AuthRequirement } from "@profile-bits/core";
import { isMissingToken } from "@profile-bits/core";

export const CHESSCOM_AUTH = "none" as const satisfies AuthRequirement;

export type ChesscomToken = string;

export function isChesscomTokenMissing(
  token: string | undefined | null,
): boolean {
  return isMissingToken(token);
}

/** Auth none: empty / missing tokens are ignored (no Action token check). */
export function assertChesscomActionToken(
  _token: string | undefined | null,
): void {}

/** Auth none never emits Authorization — always `{}`, never Authorization: "". */
export function chesscomAuthorizationHeader(
  _token: string | undefined | null,
): Readonly<Record<string, string>> {
  return {};
}

export function chesscomRequiresAuthorization(): boolean {
  return false;
}
