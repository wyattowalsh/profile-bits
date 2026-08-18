"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { CodeRail } from "@/src/codegen/code-rail";
import { PLAYGROUND_PLUGIN } from "@/src/codegen/constants";
import { exportWorkflow } from "@/src/codegen/export-workflow";
import { PackEmitter, packEmitterState } from "@/src/codegen/pack-emitter";
import { exportReadmeMarkdown } from "@/src/codegen/readme-mode";
import { SourceDrop } from "@/src/codegen/source-drop";
import { CrossLink } from "@/src/preview/cross-link";
import { FixturePill } from "@/src/preview/fixture-pill";
import { GlobalBar, type GlobalBarValue } from "@/src/preview/global-bar";
import { parse, pickOptions, serialize } from "@/src/preview/permalink";
import { PreviewStage } from "@/src/preview/preview-stage";
import { SchemaForm, setPathValue } from "@/src/preview/schema-form";
import {
  isPreviewOutputFormat,
  isPreviewTheme,
  isPreviewWidgetId,
  PREVIEW_WIDGET_IDS,
  type PreviewRequest,
  type PreviewWidgetId,
} from "@/src/preview/types";
import { isAutoPreviewScope, usePreview } from "@/src/preview/use-preview";

export { PLAYGROUND_PLUGIN };
export const GENERATE_BUTTON_LABEL = "Generate";

const DEFAULT_ENABLED: readonly PreviewWidgetId[] = ["demo"];

const PLAYGROUND_SHELL_CSS = `
[data-slot="playground-shell"] {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem 1rem 1.5rem;
}
[data-slot="playground-toolbar"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}
[data-slot="playground-toolbar"] h1 {
  margin: 0;
  margin-inline-end: auto;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
[data-slot="playground-columns"] {
  display: grid;
  grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr) minmax(16rem, 24rem);
  gap: 0.75rem;
  align-items: start;
}
[data-slot="playground-tuners"],
[data-slot="playground-stage"],
[data-slot="playground-emit"] {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: var(--color-fd-card);
}
[data-slot="playground-column-title"] {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-fd-muted-foreground);
}
[data-slot="plugin-selector"] select {
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  padding: 0.25rem 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875rem;
}
[data-slot="widget-checkboxes"] {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  border: 0;
  padding: 0;
}
[data-slot="widget-checkboxes"] label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
}
[data-slot="preview-generate"] {
  justify-self: start;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
  cursor: pointer;
}
[data-slot="preview-generate"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="playground-error"] {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-fd-destructive, var(--color-fd-foreground));
}
@media (max-width: 64rem) {
  [data-slot="playground-columns"] {
    grid-template-columns: 1fr;
  }
}
`;

export type PlaygroundShellProps = {
  children?: ReactNode;
  className?: string;
};

export function widgetFromPathname(
  pathname: string,
): PreviewWidgetId | undefined {
  const parts = pathname.split("/").filter(Boolean);
  const widget = parts[2];
  if (
    parts[0] === "playground" &&
    parts[1] === "github" &&
    widget !== undefined &&
    isPreviewWidgetId(widget)
  ) {
    return widget;
  }
  return undefined;
}

function requestFromLocation(
  search: URLSearchParams | string,
  pathname: string,
): PreviewRequest {
  const parsed = parse(search);
  const pathWidget = widgetFromPathname(pathname);
  const globals = {
    options: pickOptions(parsed.options),
    format: parsed.format,
    theme: parsed.theme,
    output_pair: parsed.output_pair,
    user: parsed.user,
  };

  if (pathWidget) {
    return {
      ...globals,
      scope: "widget",
      plugin: PLAYGROUND_PLUGIN,
      widget: pathWidget,
    };
  }

  if (parsed.scope === "widget") {
    return {
      ...globals,
      scope: "widget",
      plugin: PLAYGROUND_PLUGIN,
      widget: parsed.widget,
    };
  }

  const request: PreviewRequest = {
    ...globals,
    scope: "plugin",
    plugin: PLAYGROUND_PLUGIN,
  };
  if (parsed.widget !== undefined) {
    request.widget = parsed.widget;
  }
  return request;
}

function enabledFromRequest(
  request: PreviewRequest,
  pathname: string,
): PreviewWidgetId[] {
  const pathWidget = widgetFromPathname(pathname);
  if (pathWidget) {
    return [pathWidget];
  }
  if (request.scope === "widget") {
    return [request.widget];
  }
  const fromOptions = PREVIEW_WIDGET_IDS.filter(
    (id) => request.options[id] !== undefined,
  );
  return fromOptions.length > 0 ? [...fromOptions] : [...DEFAULT_ENABLED];
}

function requestWithEnabled(
  request: PreviewRequest,
  enabled: readonly PreviewWidgetId[],
): PreviewRequest {
  const globals = {
    options: pickOptions(request.options),
    format: request.format,
    theme: request.theme,
    output_pair: request.output_pair,
    user: request.user,
  };
  if (enabled.length === 1 && enabled[0] !== undefined) {
    return {
      ...globals,
      scope: "widget",
      plugin: PLAYGROUND_PLUGIN,
      widget: enabled[0],
    };
  }
  return {
    ...globals,
    scope: "plugin",
    plugin: PLAYGROUND_PLUGIN,
  };
}

function toggleWidget(
  enabled: readonly PreviewWidgetId[],
  widget: PreviewWidgetId,
): PreviewWidgetId[] {
  if (enabled.includes(widget)) {
    return PREVIEW_WIDGET_IDS.filter(
      (id) => id !== widget && enabled.includes(id),
    );
  }
  return PREVIEW_WIDGET_IDS.filter(
    (id) => id === widget || enabled.includes(id),
  );
}

function applyGlobalBarValue(
  request: PreviewRequest,
  value: GlobalBarValue,
): PreviewRequest {
  const options = pickOptions({
    ...request.options,
    format: value.format,
    theme: value.theme,
    output_pair: value.output_pair,
  });
  return {
    ...request,
    options,
    format: value.format,
    theme: value.theme,
    output_pair: value.output_pair,
    user: value.user,
  };
}

/**
 * Client island for `/playground/*`.
 * Three columns: left tuners, center Takumi stage, right pack emit + copy rail.
 * v0 pack is github only. Primary CTA is Copy (CodeRail).
 */
export function PlaygroundShell({ children, className }: PlaygroundShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [boot] = useState(() => requestFromLocation(searchParams, pathname));
  const preview = usePreview(boot);
  const request = preview.request;
  const setRequest = preview.setRequest;
  const [enabled, setEnabled] = useState<PreviewWidgetId[]>(() =>
    enabledFromRequest(boot, pathname),
  );
  const [animated, setAnimated] = useState(
    () => boot.options.demo?.animate === true,
  );

  useEffect(() => {
    const next = requestFromLocation(
      new URLSearchParams(window.location.search),
      pathname,
    );
    setRequest(next);
    setEnabled(enabledFromRequest(next, pathname));
  }, [pathname, setRequest]);

  const permalinkQuery = serialize(request).toString();
  const crossHref = permalinkQuery ? `${pathname}?${permalinkQuery}` : pathname;
  const autoPreview = isAutoPreviewScope(request);

  useEffect(() => {
    const href = permalinkQuery ? `${pathname}?${permalinkQuery}` : pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== href) {
      window.history.replaceState(window.history.state, "", href);
    }
  }, [pathname, permalinkQuery]);

  const emitState = useMemo(
    () => ({
      ...packEmitterState(request),
      enabled,
      animated,
    }),
    [animated, enabled, request],
  );
  const emitted = useMemo(() => exportWorkflow(emitState), [emitState]);
  const readmeMarkdown = useMemo(
    () => exportReadmeMarkdown(enabled),
    [enabled],
  );

  const formValues = {
    ...request.options,
    format: request.format,
    theme: request.theme,
    output_pair: request.output_pair,
    user: request.user,
    animated,
  };

  const handleSchemaChange = useCallback(
    (path: string, value: unknown) => {
      if (
        path === "format" &&
        typeof value === "string" &&
        isPreviewOutputFormat(value)
      ) {
        setRequest((prev) =>
          applyGlobalBarValue(prev, {
            format: value,
            theme: prev.theme,
            output_pair: prev.output_pair,
            user: prev.user,
          }),
        );
        return;
      }
      if (
        path === "theme" &&
        typeof value === "string" &&
        isPreviewTheme(value)
      ) {
        setRequest((prev) =>
          applyGlobalBarValue(prev, {
            format: prev.format,
            theme: value,
            output_pair: prev.output_pair,
            user: prev.user,
          }),
        );
        return;
      }
      if (path === "output_pair") {
        setRequest((prev) =>
          applyGlobalBarValue(prev, {
            format: prev.format,
            theme: prev.theme,
            output_pair: Boolean(value),
            user: prev.user,
          }),
        );
        return;
      }
      if (path === "user") {
        setRequest((prev) => ({
          ...prev,
          user: typeof value === "string" ? value : "",
        }));
        return;
      }
      if (path === "animated") {
        setAnimated(Boolean(value));
        return;
      }
      setRequest((prev) => ({
        ...prev,
        options: pickOptions(setPathValue(prev.options, path, value)),
      }));
    },
    [setRequest],
  );

  const onWidgetsChange = useCallback(
    (widget: PreviewWidgetId) => {
      setEnabled((prev) => {
        const next = toggleWidget(prev, widget);
        setRequest((requestPrev) => requestWithEnabled(requestPrev, next));
        return next;
      });
    },
    [setRequest],
  );

  return (
    <>
      <style href="profile-bits-playground-shell" precedence="default">
        {PLAYGROUND_SHELL_CSS}
      </style>
      <div
        data-slot="playground-shell"
        data-plugin={PLAYGROUND_PLUGIN}
        className={cn(className)}
      >
        <header data-slot="playground-toolbar">
          <h1>Playground · {PLAYGROUND_PLUGIN}</h1>
          <CrossLink href={crossHref} />
        </header>
        <div data-slot="playground-columns">
          <aside data-slot="playground-tuners" aria-label="Tuners">
            <p data-slot="playground-column-title">Tuners</p>
            <Field data-slot="plugin-selector" data-plugin={PLAYGROUND_PLUGIN}>
              <FieldLabel htmlFor="playground-plugin">Plugin</FieldLabel>
              <select
                id="playground-plugin"
                name="plugin"
                value={PLAYGROUND_PLUGIN}
                aria-label="Plugin"
                onChange={() => undefined}
              >
                <option value={PLAYGROUND_PLUGIN}>{PLAYGROUND_PLUGIN}</option>
              </select>
            </Field>
            <fieldset data-slot="widget-checkboxes">
              <legend>Widgets</legend>
              {PREVIEW_WIDGET_IDS.map((widget) => (
                <label key={widget} htmlFor={`playground-widget-${widget}`}>
                  <input
                    id={`playground-widget-${widget}`}
                    name="widgets"
                    type="checkbox"
                    value={widget}
                    checked={enabled.includes(widget)}
                    onChange={() => onWidgetsChange(widget)}
                  />
                  {widget}
                </label>
              ))}
            </fieldset>
            <SourceDrop />
            <SchemaForm values={formValues} onChange={handleSchemaChange} />
            <GlobalBar
              value={{
                format: request.format,
                theme: request.theme,
                output_pair: request.output_pair,
                user: request.user,
              }}
              onChange={(value) => {
                setRequest((prev) => applyGlobalBarValue(prev, value));
              }}
            />
            {autoPreview ? null : (
              <button
                type="button"
                data-slot="preview-generate"
                onClick={() => {
                  preview.generate();
                }}
              >
                {GENERATE_BUTTON_LABEL}
              </button>
            )}
          </aside>
          <section data-slot="playground-stage" aria-label="Preview">
            <p data-slot="playground-column-title">Stage</p>
            <FixturePill provenance={preview.provenance ?? "fixture"} />
            <PreviewStage
              files={preview.files}
              loading={preview.loading}
              output_pair={request.output_pair}
              format={request.format}
              motion={request.format === "webp"}
              reducedMotion={preview.reducedMotion}
            />
            {preview.error ? (
              <p data-slot="playground-error" role="alert">
                {preview.error.message}
              </p>
            ) : null}
            <div data-slot="playground-page">{children}</div>
          </section>
          <aside data-slot="playground-emit" aria-label="Emit">
            <p data-slot="playground-column-title">Emit</p>
            <PackEmitter state={emitState} />
            <CodeRail
              workflowYml={emitted.workflowYml}
              configYml={emitted.configYml}
              readmeMarkdown={readmeMarkdown}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
