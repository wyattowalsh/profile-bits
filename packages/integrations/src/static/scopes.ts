/** Declared scopes. Empty is valid for fixture-only static. */
export const STATIC_SCOPES = [] as const;

export type StaticScope = (typeof STATIC_SCOPES)[number];
