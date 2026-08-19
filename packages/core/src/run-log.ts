import { redactSecrets } from "./redact.js";
import type { SkipFailOutcome } from "./types.js";

export type RunLogEvent = {
  v: 1;
  src: "profile-bits";
  kind: "widget" | "call";
  pkg?: "action" | "integrations" | "renderer";
  widget?: string;
  integration?: "github" | "http" | "rss" | "wakatime";
  op?: string;
  outcome?: "ok" | SkipFailOutcome;
  status?: number;
  duration_ms?: number;
  cache?: "hit" | "miss" | "coalesce";
  cost?: number;
  host?: string;
  path?: string;
  reason?: string;
  message?: string;
};

export type RunLogSink = (event: RunLogEvent) => void;

export function publicUrlParts(url: string): { host: string; path: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    path: parsed.pathname,
  };
}

export function formatLogEvent(event: RunLogEvent): string {
  return JSON.stringify({ ...event, v: 1, src: "profile-bits" });
}

export function redactLogMessage(
  message: string,
  secrets: readonly (string | undefined | null)[] = [],
): string {
  return redactSecrets(message, secrets);
}
