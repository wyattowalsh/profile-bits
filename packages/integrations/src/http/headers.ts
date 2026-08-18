const FORBIDDEN_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
]);

export function isForbiddenHeaderName(name: string): boolean {
  return FORBIDDEN_HEADER_NAMES.has(name.toLowerCase()) || /token/i.test(name);
}

export function isForbiddenHeaderValue(value: string): boolean {
  return /^(Bearer|token|Basic)\s/i.test(value);
}

export function assertSafeYamlHeaders(
  headers: Readonly<Record<string, string>> | undefined,
): void {
  if (headers == null) {
    return;
  }
  for (const [name, value] of Object.entries(headers)) {
    if (isForbiddenHeaderName(name) || isForbiddenHeaderValue(value)) {
      throw new Error("forbidden header");
    }
  }
}
