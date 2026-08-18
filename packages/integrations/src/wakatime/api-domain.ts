import {
  CODING_RANGE_TOKENS,
  type CodingRange,
  isForbiddenApiDomain,
} from "@profile-bits/core";

export class UnsafeApiDomainError extends Error {
  override readonly name = "UnsafeApiDomainError";

  constructor(input: string) {
    super(`Unsafe api_domain: ${input}`);
  }
}

export function assertSafeApiDomain(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (isForbiddenApiDomain(input) || isForbiddenApiDomain(normalized)) {
    throw new UnsafeApiDomainError(input);
  }
  return normalized;
}

export function resolveStatsUrl(apiDomain: string, range: CodingRange): URL {
  if (!(CODING_RANGE_TOKENS as readonly string[]).includes(range)) {
    throw new UnsafeApiDomainError(range);
  }
  const host = assertSafeApiDomain(apiDomain);
  if (host === "wakatime.com") {
    return new URL(`https://wakatime.com/api/v1/users/current/stats/${range}`);
  }
  return new URL(
    `https://${host}/api/compat/wakatime/v1/users/current/stats/${range}`,
  );
}
