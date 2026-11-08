"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { parse, serialize } from "@/src/preview/permalink";
import { PreviewStage } from "@/src/preview/preview-stage";
import { SchemaForm, type SchemaFormValue } from "@/src/preview/schema-form";
import {
  defaultWidgetsForPlugin,
  isPreviewPluginId,
  isWidgetIdForPlugin,
  PREVIEW_PLUGIN_IDS,
  type PreviewOptions,
  type PreviewPluginId,
  type PreviewRequest,
  type PreviewWidgetId,
  widgetsForPlugin,
} from "@/src/preview/types";
import { isAutoPreviewScope, usePreview } from "@/src/preview/use-preview";

export { PLAYGROUND_PLUGIN };
export const GENERATE_BUTTON_LABEL = "Generate";

/** Route pack. Unknown / missing plugin segments fall back to github. */
export function pluginFromPathname(pathname: string): PreviewPluginId {
  const parts = pathname.split("/").filter(Boolean);
  const plugin = parts[1];
  if (
    parts[0] === "playground" &&
    plugin !== undefined &&
    isPreviewPluginId(plugin)
  ) {
    return plugin;
  }
  return PLAYGROUND_PLUGIN;
}

export function playgroundHref(
  plugin: PreviewPluginId,
  widget?: PreviewWidgetId,
): string {
  if (widget !== undefined && isWidgetIdForPlugin(plugin, widget)) {
    return `/playground/${plugin}/${widget}`;
  }
  return `/playground/${plugin}`;
}

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
  const plugin = parts[1];
  const widget = parts[2];
  if (
    parts[0] === "playground" &&
    plugin !== undefined &&
    isPreviewPluginId(plugin) &&
    widget !== undefined &&
    isWidgetIdForPlugin(plugin, widget)
  ) {
    return widget;
  }
  return undefined;
}

function withGlobalOptions(
  options: PreviewOptions,
  value: Pick<GlobalBarValue, "format" | "theme" | "output_pair">,
): PreviewOptions {
  return {
    ...options,
    format: value.format,
    theme: value.theme,
    output_pair: value.output_pair,
  };
}

function requestFromLocation(
  search: URLSearchParams | string,
  pathname: string,
): PreviewRequest {
  const parsed = parse(search);
  const plugin = pluginFromPathname(pathname);
  const pathWidget = widgetFromPathname(pathname);
  const globals = {
    options: parsed.options,
    format: parsed.format,
    theme: parsed.theme,
    output_pair: parsed.output_pair,
    user: parsed.user,
  };

  if (pathWidget) {
    return {
      ...globals,
      scope: "widget",
      plugin,
      widget: pathWidget,
    };
  }

  if (
    parsed.scope === "widget" &&
    parsed.widget !== undefined &&
    isWidgetIdForPlugin(plugin, parsed.widget)
  ) {
    return {
      ...globals,
      scope: "widget",
      plugin,
      widget: parsed.widget,
    };
  }

  const request: PreviewRequest = {
    ...globals,
    scope: "plugin",
    plugin,
  };
  if (
    parsed.widget !== undefined &&
    isWidgetIdForPlugin(plugin, parsed.widget)
  ) {
    request.widget = parsed.widget;
  }
  return request;
}

function enabledFromRequest(
  request: PreviewRequest,
  pathname: string,
): PreviewWidgetId[] {
  const plugin = pluginFromPathname(pathname);
  const pathWidget = widgetFromPathname(pathname);
  if (pathWidget) {
    return [pathWidget];
  }
  if (
    request.scope === "widget" &&
    isWidgetIdForPlugin(plugin, request.widget)
  ) {
    return [request.widget];
  }
  const allowed = widgetsForPlugin(plugin);
  const fromOptions = allowed.filter((id) => request.options[id] !== undefined);
  return fromOptions.length > 0
    ? [...fromOptions]
    : [...defaultWidgetsForPlugin(plugin)];
}

function requestWithEnabled(
  request: PreviewRequest,
  enabled: readonly PreviewWidgetId[],
  plugin: PreviewPluginId,
): PreviewRequest {
  const globals = {
    options: request.options,
    format: request.format,
    theme: request.theme,
    output_pair: request.output_pair,
    user: request.user,
  };
  if (enabled.length === 1 && enabled[0] !== undefined) {
    return {
      ...globals,
      scope: "widget",
      plugin,
      widget: enabled[0],
    };
  }
  return {
    ...globals,
    scope: "plugin",
    plugin,
  };
}

function toggleWidget(
  enabled: readonly PreviewWidgetId[],
  widget: PreviewWidgetId,
  plugin: PreviewPluginId,
): PreviewWidgetId[] {
  const order = widgetsForPlugin(plugin);
  if (enabled.includes(widget)) {
    return order.filter((id) => id !== widget && enabled.includes(id));
  }
  return order.filter((id) => id === widget || enabled.includes(id));
}

function applyGlobalBarValue(
  request: PreviewRequest,
  value: GlobalBarValue,
): PreviewRequest {
  return {
    ...request,
    options: withGlobalOptions(request.options, value),
    format: value.format,
    theme: value.theme,
    output_pair: value.output_pair,
    user: value.user,
  };
}

/**
 * Client island for `/playground/*`.
 * Three columns: left tuners, center Takumi stage, right pack emit + copy rail.
 * Selector lists four first-party packs. Primary CTA is Copy (CodeRail).
 */
export function PlaygroundShell({ children, className }: PlaygroundShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const plugin = pluginFromPathname(pathname);
  const packWidgets = widgetsForPlugin(plugin);
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
      plugin,
      enabled,
      animated,
    }),
    [animated, enabled, plugin, request],
  );
  const emitted = useMemo(() => exportWorkflow(emitState), [emitState]);
  const readmeMarkdown = useMemo(
    () => exportReadmeMarkdown(enabled),
    [enabled],
  );

  const formValue: SchemaFormValue = {
    format: request.format,
    theme: request.theme,
    output_pair: request.output_pair,
    user: request.user,
    animated,
    options: request.options,
  };

  const handleSchemaChange = useCallback(
    (next: SchemaFormValue) => {
      if (next.animated !== undefined) {
        setAnimated(Boolean(next.animated));
      }
      setRequest((prev) => ({
        ...prev,
        user: next.user ?? prev.user,
        format: next.format ?? prev.format,
        theme: next.theme ?? prev.theme,
        output_pair: next.output_pair ?? prev.output_pair,
        options: next.options ?? prev.options,
      }));
    },
    [setRequest],
  );

  const onWidgetsChange = useCallback(
    (widget: PreviewWidgetId) => {
      setEnabled((prev) => {
        const next = toggleWidget(prev, widget, plugin);
        setRequest((requestPrev) =>
          requestWithEnabled(requestPrev, next, plugin),
        );
        return next;
      });
    },
    [plugin, setRequest],
  );

  const onPluginChange = useCallback(
    (nextPlugin: string) => {
      if (isPreviewPluginId(nextPlugin)) {
        router.push(playgroundHref(nextPlugin));
      }
    },
    [router],
  );

  return (
    <>
      <style href="profile-bits-playground-shell" precedence="default">
        {PLAYGROUND_SHELL_CSS}
      </style>
      <div
        data-slot="playground-shell"
        data-plugin={plugin}
        className={cn(className)}
      >
        <header data-slot="playground-toolbar">
          <h1>Playground · {plugin}</h1>
          <CrossLink href={crossHref} />
        </header>
        <div data-slot="playground-columns">
          <aside data-slot="playground-tuners" aria-label="Tuners">
            <p data-slot="playground-column-title">Tuners</p>
            <Field data-slot="plugin-selector" data-plugin={plugin}>
              <FieldLabel htmlFor="playground-plugin">Plugin</FieldLabel>
              <select
                id="playground-plugin"
                name="plugin"
                value={plugin}
                aria-label="Plugin"
                onChange={(event) => onPluginChange(event.target.value)}
              >
                {PREVIEW_PLUGIN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset data-slot="widget-checkboxes">
              <legend>Widgets</legend>
              {packWidgets.map((widget) => (
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
            <SchemaForm
              plugin={plugin}
              value={formValue}
              onChange={handleSchemaChange}
            />
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
              readmeMd={readmeMarkdown}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
