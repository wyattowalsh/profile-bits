import * as z from "zod";
import { WakatimeSliceItemSchema } from "./payload.js";

const SECRET_KEYS = new Set([
  "email",
  "api_key",
  "access_token",
  "client_secret",
  "password",
  "subscribers",
  "shared_with",
]);

const WakatimeSliceListSchema = z.array(WakatimeSliceItemSchema).optional();

export const WakatimeAllTimeRangeSchema = z.object({
  start: z.string().optional(),
  start_date: z.string().optional(),
  start_text: z.string().optional(),
  end: z.string().optional(),
  end_date: z.string().optional(),
  end_text: z.string().optional(),
  timezone: z.string().optional(),
});
export type WakatimeAllTimeRange = z.infer<typeof WakatimeAllTimeRangeSchema>;

export const WakatimeAllTimeSinceTodaySchema = z.object({
  total_seconds: z.number(),
  text: z.string().optional(),
  digital: z.string().optional(),
  decimal: z.string().optional(),
  daily_average: z.number().optional(),
  is_up_to_date: z.boolean().optional(),
  percent_calculated: z.number().optional(),
  timeout: z.number().optional(),
  range: WakatimeAllTimeRangeSchema.optional(),
});
export type WakatimeAllTimeSinceToday = z.infer<
  typeof WakatimeAllTimeSinceTodaySchema
>;

export const WakatimeAllTimeEnvelopeSchema = z.object({
  data: WakatimeAllTimeSinceTodaySchema,
});

export const WakatimeGrandTotalSchema = z.object({
  total_seconds: z.number().optional(),
  text: z.string().optional(),
  digital: z.string().optional(),
  decimal: z.string().optional(),
  hours: z.number().optional(),
  minutes: z.number().optional(),
  seconds: z.number().optional(),
});
export type WakatimeGrandTotal = z.infer<typeof WakatimeGrandTotalSchema>;

export const WakatimeDayRangeSchema = z.object({
  date: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  text: z.string().optional(),
  timezone: z.string().optional(),
});
export type WakatimeDayRange = z.infer<typeof WakatimeDayRangeSchema>;

export const WakatimeSummaryDaySchema = z.object({
  grand_total: WakatimeGrandTotalSchema.optional(),
  categories: WakatimeSliceListSchema,
  projects: WakatimeSliceListSchema,
  languages: WakatimeSliceListSchema,
  editors: WakatimeSliceListSchema,
  operating_systems: WakatimeSliceListSchema,
  dependencies: WakatimeSliceListSchema,
  machines: WakatimeSliceListSchema,
  range: WakatimeDayRangeSchema.optional(),
});
export type WakatimeSummaryDay = z.infer<typeof WakatimeSummaryDaySchema>;

export const WakatimeSummariesSchema = z.object({
  data: z.array(WakatimeSummaryDaySchema),
  start: z.string().optional(),
  end: z.string().optional(),
  cumulative_total: WakatimeGrandTotalSchema.optional(),
  daily_average: z
    .object({
      seconds: z.number().optional(),
      text: z.string().optional(),
    })
    .optional(),
});
export type WakatimeSummaries = z.infer<typeof WakatimeSummariesSchema>;

export const WakatimeStatusbarTodaySchema = z.object({
  grand_total: WakatimeGrandTotalSchema,
  categories: WakatimeSliceListSchema,
  projects: WakatimeSliceListSchema,
  languages: WakatimeSliceListSchema,
  editors: WakatimeSliceListSchema,
  operating_systems: WakatimeSliceListSchema,
  dependencies: WakatimeSliceListSchema,
  machines: WakatimeSliceListSchema,
  range: WakatimeDayRangeSchema.optional(),
});
export type WakatimeStatusbarToday = z.infer<
  typeof WakatimeStatusbarTodaySchema
>;

export const WakatimeStatusbarEnvelopeSchema = z.object({
  data: WakatimeStatusbarTodaySchema,
});

export const WakatimeGoalChartPointSchema = z.object({
  actual_seconds: z.number().optional(),
  actual_seconds_text: z.string().optional(),
  goal_seconds: z.number().optional(),
  goal_seconds_text: z.string().optional(),
  range_status: z.string().optional(),
  range_status_reason: z.string().optional(),
  range: WakatimeDayRangeSchema.optional(),
});
export type WakatimeGoalChartPoint = z.infer<
  typeof WakatimeGoalChartPointSchema
>;

export const WakatimeGoalSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  custom_title: z.string().optional(),
  type: z.string().optional(),
  delta: z.string().optional(),
  status: z.string().optional(),
  average_status: z.string().optional(),
  cumulative_status: z.string().optional(),
  seconds: z.number().optional(),
  range_text: z.string().optional(),
  is_enabled: z.boolean().optional(),
  is_inverse: z.boolean().optional(),
  is_snoozed: z.boolean().optional(),
  languages: z.array(z.string()).optional(),
  editors: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  modified_at: z.string().optional(),
  chart_data: z.array(WakatimeGoalChartPointSchema).optional(),
});
export type WakatimeGoal = z.infer<typeof WakatimeGoalSchema>;

export const WakatimeGoalsEnvelopeSchema = z.object({
  data: z.array(WakatimeGoalSchema),
});

export type WakatimeDumpExtras = {
  all_time_since_today?: WakatimeAllTimeSinceToday;
  summaries?: WakatimeSummaries;
  statusbar_today?: WakatimeStatusbarToday;
  goals?: readonly WakatimeGoal[];
};

export type WakatimeDump = import("./payload.js").WakatimeStatsData &
  WakatimeDumpExtras;

export function omitWakatimeSecrets<T>(value: T): T {
  return omitSecretsValue(value) as T;
}

function omitSecretsValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(omitSecretsValue);
  }
  if (value != null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SECRET_KEYS.has(key.toLowerCase())) {
        continue;
      }
      out[key] = omitSecretsValue(nested);
    }
    return out;
  }
  return value;
}

export function parseAllTimeSinceToday(
  body: unknown,
): WakatimeAllTimeSinceToday | undefined {
  const parsed = WakatimeAllTimeEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return undefined;
  }
  return omitWakatimeSecrets(parsed.data.data);
}

export function parseSummaries(body: unknown): WakatimeSummaries | undefined {
  const parsed = WakatimeSummariesSchema.safeParse(body);
  if (!parsed.success) {
    return undefined;
  }
  return omitWakatimeSecrets(parsed.data);
}

export function parseStatusbarToday(
  body: unknown,
): WakatimeStatusbarToday | undefined {
  const parsed = WakatimeStatusbarEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return undefined;
  }
  return omitWakatimeSecrets(parsed.data.data);
}

export function parseGoals(body: unknown): readonly WakatimeGoal[] | undefined {
  const parsed = WakatimeGoalsEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return undefined;
  }
  return omitWakatimeSecrets(parsed.data.data);
}
