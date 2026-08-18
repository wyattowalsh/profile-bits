import * as z from "zod";

export const CODING_FILENAME_DEFAULT = "wakatime";
export const CODING_RANGE_TOKENS = [
  "last_7_days",
  "last_30_days",
  "last_6_months",
  "last_year",
] as const;
export const CODING_RANGE_DEFAULT = "last_7_days" as const;
export const CODING_INCLUDE_TOKENS = [
  "languages",
  "editors",
  "projects",
  "os",
] as const;
export const CODING_INCLUDE_DEFAULT = [
  "languages",
  "editors",
] as const satisfies readonly (typeof CODING_INCLUDE_TOKENS)[number][];
export const CODING_LIMIT_MIN = 1;
export const CODING_LIMIT_MAX = 16;
export const CODING_LIMIT_DEFAULT = 8;
export const CODING_API_DOMAIN_DEFAULT = "wakatime.com";
export const CODING_ANIMATE_DEFAULT = false;

export const CodingRangeSchema = z.enum(CODING_RANGE_TOKENS);
export type CodingRange = z.infer<typeof CodingRangeSchema>;

export const CodingIncludeTokenSchema = z.enum(CODING_INCLUDE_TOKENS);
export type CodingIncludeToken = z.infer<typeof CodingIncludeTokenSchema>;

const HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const FORBIDDEN_API_DOMAIN_LABELS = new Set([
  "localhost",
  "metadata.google.internal",
]);

export function isForbiddenApiDomain(value: string): boolean {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (trimmed === "") {
    return true;
  }
  if (/[:/?#@]/.test(trimmed)) {
    return true;
  }
  if (FORBIDDEN_API_DOMAIN_LABELS.has(lower)) {
    return true;
  }
  if (lower.endsWith(".localhost") || lower.endsWith(".local")) {
    return true;
  }
  if (lower === "metadata.google.internal" || lower.endsWith(".internal")) {
    return true;
  }
  if (
    z.ipv4().safeParse(trimmed).success ||
    z.ipv6().safeParse(trimmed).success
  ) {
    return true;
  }
  if (z.url().safeParse(trimmed).success) {
    return true;
  }
  return !HOSTNAME_PATTERN.test(trimmed);
}

export const ApiDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => !isForbiddenApiDomain(value), {
    message:
      "api_domain must be a hostname only (no scheme, path, port, userinfo, IP, localhost, or metadata host)",
  });

export function dedupePreserveOrder<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export const CodingOptionsSchema = z.strictObject({
  filename: z.string().default(CODING_FILENAME_DEFAULT),
  range: CodingRangeSchema.default(CODING_RANGE_DEFAULT),
  include: z
    .array(CodingIncludeTokenSchema)
    .min(1)
    .default(() => [...CODING_INCLUDE_DEFAULT]),
  limit: z
    .int()
    .min(CODING_LIMIT_MIN)
    .max(CODING_LIMIT_MAX)
    .default(CODING_LIMIT_DEFAULT),
  api_domain: ApiDomainSchema.default(CODING_API_DOMAIN_DEFAULT),
  animate: z.boolean().default(CODING_ANIMATE_DEFAULT),
});
export type CodingOptions = z.infer<typeof CodingOptionsSchema>;

export const WakatimeWidgetsConfigSchema = z.strictObject({
  coding: CodingOptionsSchema.optional(),
});
export type WakatimeWidgetsConfig = z.infer<typeof WakatimeWidgetsConfigSchema>;

export const WakatimePluginConfigSchema = z.strictObject({
  widgets: WakatimeWidgetsConfigSchema.optional(),
});
export type WakatimePluginConfig = z.infer<typeof WakatimePluginConfigSchema>;

export const CODING_OPTION_DEFAULTS = {
  filename: CODING_FILENAME_DEFAULT,
  range: CODING_RANGE_DEFAULT,
  include: CODING_INCLUDE_DEFAULT,
  limit: CODING_LIMIT_DEFAULT,
  api_domain: CODING_API_DOMAIN_DEFAULT,
  animate: CODING_ANIMATE_DEFAULT,
} as const;
