/**
 * static auth is `none`: no Authorization, no GitHub, fixtures only.
 */

export const STATIC_ID = "static" as const;
export const STATIC_AUTH = "none" as const;

export type StaticAuth = typeof STATIC_AUTH;

export function staticRequiresAuthorization(): boolean {
  return false;
}

/** Auth none never emits Authorization. */
export function staticAuthorizationHeader(
  _token?: string | null,
): Readonly<Record<string, string>> {
  return {};
}

/** Auth none: empty / missing tokens are ignored (no Action token check). */
export function assertStaticActionToken(_token?: string | null): void {}
