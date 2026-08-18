import { chipFixture, normalizeBadgeJson } from "@profile-bits/integrations";
import { renderChipsFromPayloads, renderChipsSvg } from "@profile-bits/plugins";
import type { Metadata } from "next";
import {
  emitChipsConfigYaml,
  emitChipsReadmeMarkdown,
  HTTP_CHIP_PRESET_IDS,
  HTTP_CHIP_TYPE_IDS,
  HTTP_PLAYGROUND_CARD_HEIGHT,
  HTTP_PLAYGROUND_CARD_WIDTH,
  HTTP_PLAYGROUND_HREF,
  HTTP_PLAYGROUND_PLUGIN,
  HTTP_PLAYGROUND_WIDGET,
  HTTP_PLAYGROUND_WIDGET_IDS,
  type HttpPlaygroundSearchParams,
  PRIMARY_CTA,
  parseHttpPlaygroundSearch,
  svgToDataUrl,
} from "@/app/playground/http/state";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { CopyButton } from "@/src/preview/copy-button";
import { FixturePill } from "@/src/preview/fixture-pill";

export {
  HTTP_PLAYGROUND_HREF,
  HTTP_PLAYGROUND_PLUGIN,
  HTTP_PLAYGROUND_WIDGET,
  HTTP_PLAYGROUND_WIDGET_IDS,
  PRIMARY_CTA,
};

export const metadata: Metadata = {
  title: "Playground · http",
  description:
    "Fixtures-only chips explorer for the http pack. Preview is baked SVG from chip fixtures. Primary action is Copy.",
};

const HTTP_PLAYGROUND_CSS = `
[data-slot="playground-http-page"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="playground-http-lede"] {
  margin: 0;
  color: var(--color-fd-muted-foreground);
  font-size: 0.875rem;
  line-height: 1.4;
}
[data-slot="playground-http-tuners"],
[data-slot="playground-http-stage"],
[data-slot="playground-http-emit"] {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: var(--color-fd-card);
}
[data-slot="playground-http-column-title"] {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-fd-muted-foreground);
}
[data-slot="playground-http-tuners"] fieldset {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  border: 0;
  padding: 0;
}
[data-slot="playground-http-tuners"] legend,
[data-slot="playground-http-tuners"] [data-slot="field-label"] {
  font-size: 0.8125rem;
  font-weight: 600;
}
[data-slot="playground-http-tuners"] label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
}
[data-slot="playground-http-tuners"] input[type="text"] {
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  min-inline-size: 12rem;
}
[data-slot="playground-http-tuners"] input:focus-visible,
[data-slot="playground-http-submit"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="playground-http-submit"] {
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
[data-slot="playground-http-panes"] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  min-width: 0;
}
[data-slot="playground-http-pane"] {
  margin: 0;
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}
[data-slot="playground-http-pane"] figcaption {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-fd-muted-foreground);
}
[data-slot="playground-http-frame"] {
  box-sizing: border-box;
  width: ${HTTP_PLAYGROUND_CARD_WIDTH}px;
  height: ${HTTP_PLAYGROUND_CARD_HEIGHT}px;
  max-width: 100%;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-muted);
  overflow: hidden;
}
[data-slot="playground-http-frame"] img {
  display: block;
  width: ${HTTP_PLAYGROUND_CARD_WIDTH}px;
  height: ${HTTP_PLAYGROUND_CARD_HEIGHT}px;
  max-width: none;
}
[data-slot="playground-http-source"] {
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
[data-slot="playground-http-rail"] {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
}
[data-slot="playground-http-rail-toolbar"] {
  display: flex;
  justify-content: flex-end;
}
@media (max-width: 64rem) {
  [data-slot="playground-http-panes"] {
    grid-template-columns: 1fr;
  }
}
`;

export type HttpPlaygroundPageProps = {
  searchParams?:
    | Promise<HttpPlaygroundSearchParams>
    | HttpPlaygroundSearchParams;
};

/**
 * Fixtures-only `/playground/http` chips explorer.
 * Preview is baked SVG from chipFixture. No live vendor requests.
 */
export default async function HttpPlaygroundPage({
  searchParams,
}: HttpPlaygroundPageProps = {}) {
  const state = parseHttpPlaygroundSearch(
    await Promise.resolve(searchParams ?? {}),
  );
  const payloads = state.types.map((type) => chipFixture(state.preset, type));
  const layoutSvg = await renderChipsFromPayloads({
    payloads,
    theme: state.theme,
  });
  const readmeSvg = await renderChipsSvg({
    badges: payloads.map((payload) => normalizeBadgeJson(payload)),
    theme: state.theme,
  });
  const configYml = emitChipsConfigYaml(state);
  const readmeMarkdown = emitChipsReadmeMarkdown();
  const layoutDataUrl = svgToDataUrl(layoutSvg);
  const readmeDataUrl = svgToDataUrl(readmeSvg);

  return (
    <section
      data-slot="playground-http-page"
      data-plugin={HTTP_PLAYGROUND_PLUGIN}
      data-widget={HTTP_PLAYGROUND_WIDGET}
      data-href={HTTP_PLAYGROUND_HREF}
      data-primary-cta={PRIMARY_CTA}
      data-preset={state.preset}
      data-provenance="fixture"
    >
      <style href="profile-bits-playground-http" precedence="default">
        {HTTP_PLAYGROUND_CSS}
      </style>
      <p data-slot="playground-http-lede">
        Fixtures-only codegen explorer for the{" "}
        <code>{HTTP_PLAYGROUND_PLUGIN}</code> pack widget{" "}
        <code>{HTTP_PLAYGROUND_WIDGET}</code>. Widgets{" "}
        {HTTP_PLAYGROUND_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Preview is baked SVG from chip fixtures. Primary CTA is {PRIMARY_CTA}.
      </p>
      <FixturePill provenance="fixture" />
      <form
        data-slot="playground-http-tuners"
        method="get"
        action={HTTP_PLAYGROUND_HREF}
      >
        <p data-slot="playground-http-column-title">Tuners</p>
        <fieldset>
          <legend>Preset</legend>
          {HTTP_CHIP_PRESET_IDS.map((preset) => (
            <label key={preset} htmlFor={`http-preset-${preset}`}>
              <input
                id={`http-preset-${preset}`}
                name="preset"
                type="radio"
                value={preset}
                defaultChecked={state.preset === preset}
              />
              {preset}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Types</legend>
          {HTTP_CHIP_TYPE_IDS.map((type) => (
            <label key={type} htmlFor={`http-type-${type}`}>
              <input
                id={`http-type-${type}`}
                name="types"
                type="checkbox"
                value={type}
                defaultChecked={state.types.includes(type)}
              />
              {type}
            </label>
          ))}
        </fieldset>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="http-package">package</FieldLabel>
            <input
              id="http-package"
              name="package"
              type="text"
              defaultValue={state.packageName}
              autoComplete="off"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="http-repo">repo</FieldLabel>
            <input
              id="http-repo"
              name="repo"
              type="text"
              defaultValue={state.repo}
              autoComplete="off"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="http-workflow">workflow</FieldLabel>
            <input
              id="http-workflow"
              name="workflow"
              type="text"
              defaultValue={state.workflow}
              autoComplete="off"
            />
          </Field>
        </FieldGroup>
        <button data-slot="playground-http-submit" type="submit">
          Preview
        </button>
      </form>
      <section data-slot="playground-http-stage" aria-label="Preview">
        <p data-slot="playground-http-column-title">Stage</p>
        <div data-slot="playground-http-panes">
          <figure data-slot="playground-http-pane" data-pane="layout">
            <div data-slot="playground-http-frame">
              <img
                src={layoutDataUrl}
                alt="chips layout fixture"
                width={HTTP_PLAYGROUND_CARD_WIDTH}
                height={HTTP_PLAYGROUND_CARD_HEIGHT}
              />
            </div>
            <figcaption>Layout · baked SVG</figcaption>
          </figure>
          <figure data-slot="playground-http-pane" data-pane="readme">
            <div data-slot="playground-http-frame">
              <img
                src={readmeDataUrl}
                alt="chips README fixture"
                width={HTTP_PLAYGROUND_CARD_WIDTH}
                height={HTTP_PLAYGROUND_CARD_HEIGHT}
              />
            </div>
            <figcaption>README mode · baked SVG</figcaption>
          </figure>
        </div>
      </section>
      <aside data-slot="playground-http-emit" aria-label="Emit">
        <p data-slot="playground-http-column-title">Emit</p>
        <div data-slot="playground-http-rail">
          <div data-slot="playground-http-rail-toolbar">
            <CopyButton
              value={configYml}
              aria-label={`${PRIMARY_CTA} config`}
            />
          </div>
          <h2>Config (.github/profile-bits.yml)</h2>
          <pre data-slot="playground-http-source" data-rail="config">
            {configYml}
          </pre>
        </div>
        <div data-slot="playground-http-rail">
          <div data-slot="playground-http-rail-toolbar">
            <CopyButton
              value={readmeMarkdown}
              aria-label={`${PRIMARY_CTA} readme`}
            />
          </div>
          <h2>README markdown</h2>
          <pre data-slot="playground-http-source" data-rail="readme">
            {readmeMarkdown}
          </pre>
        </div>
      </aside>
    </section>
  );
}
