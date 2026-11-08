/**
 * Destination: packages/integrations/src/leetcode/auth.ts
 * Scheme none. No Authorization. Assert is a no-op.
 */
import type { AuthRequirement } from "@profile-bits/core";
import { isMissingToken } from "@profile-bits/core";

export const LEETCODE_AUTH = "none" as const satisfies AuthRequirement;

export type LeetcodeToken = string;

export function isLeetcodeTokenMissing(
  token: string | undefined | null,
): boolean {
  return isMissingToken(token);
}

/** Auth none: there is no leetcode_token Action input. */
export function assertLeetcodeActionToken(
  _token: string | undefined | null,
): void {}

/** Auth none never emits Authorization — always `{}`, never Authorization: "". */
export function leetcodeAuthorizationHeader(
  _token: string | undefined | null,
): Readonly<Record<string, string>> {
  return {};
}

export function leetcodeRequiresAuthorization(): boolean {
  return false;
}
