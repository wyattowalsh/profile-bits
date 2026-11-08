/**
 * GitHub widgets select from the cached REST/GraphQL dump.
 * Extra dump keys MUST NOT fail parse. Widgets MUST NOT perform HTTP.
 * include / limit / min_pct / exclude stay in the widget view-models.
 */

export type DumpLanguage = {
  name: string;
  bytes: number;
};

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function dumpUser(payload: unknown): Record<string, unknown> | null {
  const record = asDumpRecord(payload);
  return asDumpRecord(record?.user) ?? record;
}

export function dumpRepositories(
  payload: unknown,
): readonly Record<string, unknown>[] {
  const record = asDumpRecord(payload);
  return recordArray(record?.repositories);
}

export function dumpLanguages(payload: unknown): readonly DumpLanguage[] {
  const record = asDumpRecord(payload);
  const list = record?.languages;
  if (!Array.isArray(list)) {
    return [];
  }
  const out: DumpLanguage[] = [];
  for (const entry of list) {
    const rec = asDumpRecord(entry);
    if (rec == null) {
      continue;
    }
    if (typeof rec.name === "string" && typeof rec.bytes === "number") {
      out.push({ name: rec.name, bytes: rec.bytes });
    }
  }
  return out;
}

export function dumpContributions(payload: unknown): number | undefined {
  const record = asDumpRecord(payload);
  const direct = numberOrUndef(record?.contributions);
  if (direct !== undefined) {
    return direct;
  }
  const calendar = asDumpRecord(record?.calendar);
  return numberOrUndef(calendar?.totalContributions);
}

export type DumpCalendarDay = {
  date: string;
  count: number;
  weekday?: number;
};

export type DumpCalendarWeek = {
  days: readonly DumpCalendarDay[];
};

export type DumpCalendar = {
  totalContributions: number;
  weeks: readonly DumpCalendarWeek[];
};

/** Calendar weeks from the github dump. Omit when the cache has no weeks. */
export function dumpCalendar(payload: unknown): DumpCalendar | undefined {
  const record = asDumpRecord(payload);
  const calendar = asDumpRecord(record?.calendar);
  if (calendar == null) {
    return undefined;
  }
  const weeks = parseCalendarWeeks(calendar.weeks);
  if (weeks.length === 0) {
    return undefined;
  }
  const total =
    numberOrUndef(calendar.totalContributions) ?? dumpContributions(payload);
  return {
    totalContributions: total ?? sumCalendarCounts(weeks),
    weeks,
  };
}

function parseCalendarWeeks(value: unknown): DumpCalendarWeek[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const weeks: DumpCalendarWeek[] = [];
  for (const entry of value) {
    const rec = asDumpRecord(entry);
    const days = parseCalendarDays(rec?.contributionDays ?? rec?.days);
    if (days.length > 0) {
      weeks.push({ days });
    }
  }
  return weeks;
}

function parseCalendarDays(value: unknown): DumpCalendarDay[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const days: DumpCalendarDay[] = [];
  for (const entry of value) {
    const rec = asDumpRecord(entry);
    if (rec == null) {
      continue;
    }
    const date = stringField(rec.date);
    const count =
      numberOrUndef(rec.count) ?? numberOrUndef(rec.contributionCount);
    if (date === "" || count === undefined) {
      continue;
    }
    const weekday = numberOrUndef(rec.weekday);
    days.push(
      weekday === undefined ? { date, count } : { date, count, weekday },
    );
  }
  return days;
}

function sumCalendarCounts(weeks: readonly DumpCalendarWeek[]): number {
  let total = 0;
  for (const week of weeks) {
    for (const day of week.days) {
      total += day.count;
    }
  }
  return total;
}

export function dumpRepository(
  payload: unknown,
): Record<string, unknown> | null {
  const record = asDumpRecord(payload);
  return asDumpRecord(record?.repository);
}

function recordArray(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: Record<string, unknown>[] = [];
  for (const entry of value) {
    const rec = asDumpRecord(entry);
    if (rec != null) {
      out.push(rec);
    }
  }
  return out;
}

export function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function numberOrUndef(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
