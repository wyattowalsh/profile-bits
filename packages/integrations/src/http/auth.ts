import { isMissingToken } from "@profile-bits/core";

export type HttpAuthorization =
  | { kind: "none" }
  | { kind: "missing" }
  | { kind: "header"; value: string };

const SCHEME_PREFIX = /^(Bearer|token|Basic)\s/i;

export function authorizationFromToken(
  token: string | undefined | null,
): HttpAuthorization {
  if (token == null) {
    return { kind: "none" };
  }
  if (isMissingToken(token)) {
    return { kind: "missing" };
  }
  const value = token.trim();
  if (SCHEME_PREFIX.test(value)) {
    return { kind: "header", value };
  }
  return { kind: "header", value: `Bearer ${value}` };
}

export function authorizationHeaderValue(
  authorization: HttpAuthorization,
): string | undefined {
  return authorization.kind === "header" ? authorization.value : undefined;
}
