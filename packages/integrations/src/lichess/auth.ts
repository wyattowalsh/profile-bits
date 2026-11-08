/**
 * Destination: packages/integrations/src/lichess/auth.ts
 * Scheme none. No Authorization. Assert is a no-op.
 */
import type { AuthRequirement } from "@profile-bits/core";
import { isMissingToken } from "@profile-bits/core";

export const LICHESS_AUTH = "none" as const satisfies AuthRequirement;

export type LichessToken = string;

export function isLichessTokenMissing(
  token: string | undefined | null,
): boolean {
  return isMissingToken(token);
}

/** Auth none: empty / missing tokens are ignored (no Action token check). */
export function assertLichessActionToken(
  _token: string | undefined | null,
): void {}

/** Auth none never emits Authorization — always `{}`, never Authorization: "". */
export function lichessAuthorizationHeader(
  _token: string | undefined | null,
): Readonly<Record<string, string>> {
  return {};
}

export function lichessRequiresAuthorization(): boolean {
  return false;
}
