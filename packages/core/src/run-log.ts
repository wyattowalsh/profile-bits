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

// Duplicated from Action workflow-log: core must not import @profile-bits/action.
function escapeWorkflowCommand(message: string): string {
  return message
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

export function createDefaultRunLogSink(): RunLogSink {
  return (event) => {
    const json = formatLogEvent(event);
    process.stderr.write(`profile-bits ${json}\n`);
    if (process.env.GITHUB_ACTIONS !== "true") {
      return;
    }
    let command: "error" | "warning" | undefined;
    if (event.outcome === "fail_run" || event.outcome === "fail_job") {
      command = "error";
    } else if (event.outcome === "fail_widget") {
      command = "warning";
    }
    if (command == null) {
      return;
    }
    process.stdout.write(
      `::${command}::${escapeWorkflowCommand(event.message ?? json)}\n`,
    );
  };
}
