import type { LanguagesOptions } from "@profile-bits/core";
import { dumpLanguages } from "../select-dump.js";
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
  const languages = dumpLanguages(payload).filter(
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
