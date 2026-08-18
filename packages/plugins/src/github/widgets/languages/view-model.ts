import type { LanguagesOptions } from "@profile-bits/core";
import type { LanguageRow } from "./widget.js";

export function languagesViewModel(
  payload: unknown,
  options: Partial<LanguagesOptions> = {},
): { rows: LanguageRow[] } {
  const limit = options.limit ?? 8;
  const minPct = options.min_pct ?? 1;
  const exclude = new Set(
    (options.exclude ?? []).map((name) => name.toLowerCase()),
  );
  const languages = readLanguages(payload).filter(
    (entry) => !exclude.has(entry.name.toLowerCase()),
  );
  const total = languages.reduce((sum, entry) => sum + entry.bytes, 0);
  if (total <= 0) {
    return { rows: [] };
  }
  const rows: LanguageRow[] = [];
  for (const entry of languages) {
    const pct = Math.round((entry.bytes / total) * 1000) / 10;
    if (pct < minPct) {
      continue;
    }
    rows.push({ name: entry.name, pct });
    if (rows.length >= limit) {
      break;
    }
  }
  return { rows };
}

function readLanguages(
  payload: unknown,
): readonly { name: string; bytes: number }[] {
  const record =
    payload != null && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const list = record.languages;
  if (!Array.isArray(list)) {
    return [];
  }
  const out: { name: string; bytes: number }[] = [];
  for (const entry of list) {
    if (entry == null || typeof entry !== "object") {
      continue;
    }
    const rec = entry as Record<string, unknown>;
    if (typeof rec.name === "string" && typeof rec.bytes === "number") {
      out.push({ name: rec.name, bytes: rec.bytes });
    }
  }
  return out;
}
