/**
 * RSS HTTP skip/fail matrix. Terminal outcome after backoff is fail_widget.
 * Do not import github classifyGithubHttp — a feed 429 must not fail the job.
 */

export const RSS_MAX_ATTEMPTS = 3;
export const RSS_RETRY_BACKOFF_MS = [200, 400, 800] as const;
export const RSS_RETRY_AFTER_CAP_MS = 10_000;

export type RssHttpAction = "fail_widget" | "retry";

export function classifyRssHttp(status: number, attempt = 1): RssHttpAction {
  const retryable = status === 429 || (status >= 500 && status <= 599);
  if (retryable && attempt < RSS_MAX_ATTEMPTS) {
    return "retry";
  }
  return "fail_widget";
}

export function rssRetryDelayMs(
  attemptIndex: number,
  retryAfterHeader?: string | null,
): number {
  const fromHeader = parseRetryAfterMs(retryAfterHeader);
  if (fromHeader !== undefined) {
    return Math.min(Math.max(0, fromHeader), RSS_RETRY_AFTER_CAP_MS);
  }
  const cappedIndex = Math.min(
    Math.max(0, attemptIndex),
    RSS_RETRY_BACKOFF_MS.length - 1,
  );
  return RSS_RETRY_BACKOFF_MS[cappedIndex] ?? 800;
}

function parseRetryAfterMs(value?: string | null): number | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  if (/^\d+$/u.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return timestamp - Date.now();
}
