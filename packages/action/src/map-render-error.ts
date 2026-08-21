import type { SkipFailOutcome } from "@profile-bits/core";
import { UnsafeApiDomainError } from "@profile-bits/integrations";
import { TakumiRenderError, TakumiTreeError } from "@profile-bits/renderer";

const RETHROW_OUTCOMES = new Set<SkipFailOutcome>([
  "fail_run",
  "fail_after_backoff",
  "fail_job",
]);

/**
 * Map Takumi / fail_widget client errors to a widget skip.
 * Rethrow fail_run / fail_after_backoff / fail_job, Unhandled*, and
 * UnsafeApiDomainError. Never catch these in engine.ts.
 */
export function mapRenderError(error: unknown): { outcome: "fail_widget" } {
  if (shouldRethrow(error)) {
    throw error;
  }
  if (isFailWidgetError(error)) {
    return { outcome: "fail_widget" };
  }
  throw error;
}

function shouldRethrow(error: unknown): boolean {
  if (error instanceof UnsafeApiDomainError) {
    return true;
  }
  if (error instanceof Error && error.name.startsWith("Unhandled")) {
    return true;
  }
  const outcome = outcomeOf(error);
  return outcome !== undefined && RETHROW_OUTCOMES.has(outcome);
}

function isFailWidgetError(error: unknown): boolean {
  if (error instanceof TakumiRenderError || error instanceof TakumiTreeError) {
    return true;
  }
  if (outcomeOf(error) === "fail_widget") {
    return true;
  }
  return isDocumentThrow(error);
}

function isDocumentThrow(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("document is not defined") ||
    message.includes("document is not available")
  );
}

function outcomeOf(error: unknown): SkipFailOutcome | undefined {
  if (error == null || typeof error !== "object" || !("outcome" in error)) {
    return undefined;
  }
  const outcome = error.outcome;
  if (
    outcome === "fail_widget" ||
    outcome === "fail_run" ||
    outcome === "fail_after_backoff" ||
    outcome === "fail_job" ||
    outcome === "skip_widget" ||
    outcome === "render"
  ) {
    return outcome;
  }
  return undefined;
}
