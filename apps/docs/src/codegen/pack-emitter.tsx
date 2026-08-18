"use client";

import { cn } from "@/lib/utils";
import type {
  PreviewOptions,
  PreviewRequest,
  PreviewWidgetId,
} from "../preview/types";
import {
  EXPORT_CONFIG_PATH,
  type ExportWorkflowState,
  type ExportWorkflowWidgets,
  exportWorkflow,
} from "./export-workflow";

export const PACK_EMITTER_WORKFLOW_SLOT = "pack-emitter-workflow";
export const PACK_EMITTER_CONFIG_SLOT = "pack-emitter-config";

export const PACK_EMITTER_WORKFLOW_LABEL = "Thin workflow YAML";
export const PACK_EMITTER_CONFIG_LABEL = ".github/profile-bits.yml";

const PACK_EMITTER_CSS = `
[data-slot="pack-emitter"] {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}
[data-slot="pack-emitter-workflow"],
[data-slot="pack-emitter-config"] {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
}
[data-slot="pack-emitter-workflow"] h2,
[data-slot="pack-emitter-config"] h2 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}
[data-slot="pack-emitter-source"] {
  margin: 0;
  padding: 0.75rem;
  overflow: auto;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-muted);
  color: var(--color-fd-foreground);
  font-size: 0.8125rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
`;

export type PackEmitterProps = {
  state: ExportWorkflowState;
  className?: string;
};

/**
 * Map playground PreviewRequest onto ExportWorkflowState.
 * Extra enumerable keys (tokens) are ignored.
 */
export function packEmitterState(request: PreviewRequest): ExportWorkflowState {
  const options = widgetOptions(request.options);
  const enabled = enabledWidgetIds(request);
  return {
    user: request.user,
    format: request.format,
    theme: request.theme,
    output_pair: request.output_pair,
    ...(hasWidgetOptions(options) ? { options } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
  };
}

/**
 * Playground-only yaml emitter. Calls `exportWorkflow` for the thin workflow
 * and `.github/profile-bits.yml` pair. Does not render copy controls.
 */
export function PackEmitter({ state, className }: PackEmitterProps) {
  const { workflowYml, configYml } = exportWorkflow(state);

  return (
    <section
      data-slot="pack-emitter"
      aria-label="Generated pack"
      className={cn(className)}
    >
      <style href="profile-bits-pack-emitter" precedence="default">
        {PACK_EMITTER_CSS}
      </style>
      <section
        data-slot="pack-emitter-workflow"
        data-pack-emitter-region="workflow"
        aria-labelledby="pack-emitter-workflow-heading"
      >
        <h2 id="pack-emitter-workflow-heading">
          {PACK_EMITTER_WORKFLOW_LABEL}
        </h2>
        <pre data-slot="pack-emitter-source">
          <code>{workflowYml}</code>
        </pre>
      </section>
      <section
        data-slot="pack-emitter-config"
        data-pack-emitter-region="config"
        aria-labelledby="pack-emitter-config-heading"
      >
        <h2 id="pack-emitter-config-heading">{PACK_EMITTER_CONFIG_LABEL}</h2>
        <pre data-slot="pack-emitter-source">
          <code>{configYml}</code>
        </pre>
      </section>
    </section>
  );
}

function widgetOptions(options: PreviewOptions): ExportWorkflowWidgets {
  const out: ExportWorkflowWidgets = {};
  if (options.demo !== undefined) {
    out.demo = options.demo;
  }
  if (options.stats !== undefined) {
    out.stats = options.stats;
  }
  if (options.languages !== undefined) {
    out.languages = options.languages;
  }
  return out;
}

function hasWidgetOptions(options: ExportWorkflowWidgets): boolean {
  return (
    options.demo !== undefined ||
    options.stats !== undefined ||
    options.languages !== undefined
  );
}

function enabledWidgetIds(
  request: PreviewRequest,
): readonly PreviewWidgetId[] | undefined {
  if (request.scope === "widget") {
    return [request.widget];
  }
  if (request.scope === "bit" && request.widget !== undefined) {
    return [request.widget];
  }
  return undefined;
}

export { EXPORT_CONFIG_PATH };
