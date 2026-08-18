import type { CodingIncludeToken } from "@profile-bits/core";
import * as z from "zod";

export const WakatimeSliceItemSchema = z.object({
  name: z.string(),
  total_seconds: z.number(),
});
export type WakatimeSliceItem = z.infer<typeof WakatimeSliceItemSchema>;

export const WakatimeStatsDataSchema = z.object({
  total_seconds: z.number(),
  human_readable_total: z.string(),
  is_up_to_date: z.boolean().optional(),
  languages: z.array(WakatimeSliceItemSchema).optional(),
  editors: z.array(WakatimeSliceItemSchema).optional(),
  projects: z.array(WakatimeSliceItemSchema).optional(),
  operating_systems: z.array(WakatimeSliceItemSchema).optional(),
});
export type WakatimeStatsData = z.infer<typeof WakatimeStatsDataSchema>;

export const WakatimeStatsEnvelopeSchema = z.object({
  data: WakatimeStatsDataSchema,
});
export type WakatimeStatsEnvelope = z.infer<typeof WakatimeStatsEnvelopeSchema>;

export type CodingPayload = {
  total_seconds: number;
  human_readable_total: string;
  languages?: WakatimeSliceItem[];
  editors?: WakatimeSliceItem[];
  projects?: WakatimeSliceItem[];
  os?: WakatimeSliceItem[];
};

const INCLUDE_SOURCE: Record<
  CodingIncludeToken,
  keyof Pick<
    WakatimeStatsData,
    "languages" | "editors" | "projects" | "operating_systems"
  >
> = {
  languages: "languages",
  editors: "editors",
  projects: "projects",
  os: "operating_systems",
};

function capSorted(
  items: readonly WakatimeSliceItem[],
  limit: number,
): WakatimeSliceItem[] {
  return [...items]
    .sort((a, b) => b.total_seconds - a.total_seconds)
    .slice(0, limit);
}

export function selectCodingPayload(
  data: WakatimeStatsData,
  include: readonly CodingIncludeToken[],
  limit: number,
): CodingPayload {
  const payload: CodingPayload = {
    total_seconds: data.total_seconds,
    human_readable_total: data.human_readable_total,
  };
  for (const key of include) {
    const source = data[INCLUDE_SOURCE[key]];
    if (source === undefined) {
      continue;
    }
    payload[key] = capSorted(source, limit);
  }
  return payload;
}
