import type { SkipFailOutcome } from "@profile-bits/core";

export type WakatimeHttpClassificationInput = {
  status: number;
  body?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function isUpToDateFalse(body: unknown): boolean {
  const root = asRecord(body);
  const data = root == null ? null : asRecord(root.data);
  return data?.is_up_to_date === false;
}

export function classifyWakatimeHttp(
  input: WakatimeHttpClassificationInput,
): SkipFailOutcome {
  const { status } = input;

  if (status === 401) {
    return "fail_run";
  }
  if (
    status === 403 ||
    status === 429 ||
    status === 302 ||
    status === 202 ||
    (status >= 500 && status <= 599)
  ) {
    return "fail_after_backoff";
  }
  if (status === 404 || status === 400) {
    return "fail_widget";
  }
  if (status === 200 && isUpToDateFalse(input.body)) {
    return "fail_after_backoff";
  }
  if (status === 200) {
    return "render";
  }
  return "fail_run";
}

export function isRedirectFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const haystack =
    `${error.message} ${String((error as { cause?: unknown }).cause)}`.toLowerCase();
  return (
    haystack.includes("redirect") || haystack.includes("unexpected redirect")
  );
}

export const WAKATIME_MAX_ATTEMPTS = 3;
export const WAKATIME_BACKOFF_MS = [200, 400, 800] as const;

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
