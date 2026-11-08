/**
 * Typed HTTP cache dumps. Json is the full JSON value (optional schema MUST
 * NOT drop keys). Chips is raw badge JSON; `normalizeBadgeJson` is widget-side.
 */

import * as z from "zod";

/** Parsed JSON value. `z.object` would strip keys; `z.json` must not. */
export const HttpJsonDumpSchema = z.json();
export type HttpJsonDump = z.infer<typeof HttpJsonDumpSchema>;

export const RAW_BADGE_JSON_KEYS = [
  "label",
  "message",
  "color",
  "name",
  "value",
  "link",
] as const;
export type RawBadgeJsonKey = (typeof RAW_BADGE_JSON_KEYS)[number];

/**
 * Raw badge JSON dump. Unknown vendor keys stay (`z.looseObject`). Fetch MUST
 * NOT map `value` → `message` or drop `name` / `value` / `link`.
 */
export const RawBadgeJsonSchema = z.looseObject({
  label: z.json().optional(),
  message: z.json().optional(),
  color: z.json().optional(),
  name: z.json().optional(),
  value: z.json().optional(),
  link: z.json().optional(),
});
export type RawBadgeJson = z.infer<typeof RawBadgeJsonSchema>;

export function parseHttpJsonDump(input: unknown): HttpJsonDump {
  return HttpJsonDumpSchema.parse(input);
}

export function parseRawBadgeJson(input: unknown): RawBadgeJson {
  return RawBadgeJsonSchema.parse(input);
}
