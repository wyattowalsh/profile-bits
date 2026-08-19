const FORBIDDEN_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
]);

const REQUIRED_HEADER_OVERRIDE = /^(accept|user-agent|authorization)$/i;

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

export function buildHttpRequestHeaders(
  authorization: string | undefined,
  extra?: Readonly<Record<string, string>>,
  required: { accept: string; userAgent: string } = {
    accept: "application/json",
    userAgent: "profile-bits-http/0",
  },
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (extra != null) {
    for (const [name, value] of Object.entries(extra)) {
      if (
        REQUIRED_HEADER_OVERRIDE.test(name) ||
        isForbiddenHeaderName(name) ||
        isForbiddenHeaderValue(value)
      ) {
        continue;
      }
      headers[name] = value;
    }
  }
  headers.Accept = required.accept;
  headers["User-Agent"] = required.userAgent;
  if (authorization != null) {
    headers.Authorization = authorization;
  }
  return headers;
}
