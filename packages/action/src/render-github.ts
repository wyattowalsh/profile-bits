import type {
  DemoOptions,
  LanguagesOptions,
  StatsOptions,
} from "@profile-bits/core";
import {
  type GithubClient,
  GithubClientError,
  type GithubPayloadInput,
} from "@profile-bits/integrations";
import {
  renderDemoSvg,
  renderLanguagesSvg,
  renderStatsSvg,
} from "@profile-bits/plugins";
import type {
  RenderWidget,
  WidgetRenderRequest,
  WidgetRenderResult,
} from "./engine.ts";

export class UnhandledGithubWidgetError extends Error {
  override readonly name = "UnhandledGithubWidgetError";

  constructor(id: string) {
    super(`github render adapter does not handle widget ${id}`);
  }
}

export function createGithubRenderWidget(input: {
  client: GithubClient;
}): RenderWidget {
  const { client } = input;
  return async (request) => renderGithubWidget(client, request);
}

async function renderGithubWidget(
  client: GithubClient,
  request: WidgetRenderRequest,
): Promise<WidgetRenderResult> {
  switch (request.id) {
    case "demo":
      return renderDemo(client, request);
    case "stats":
      return renderStats(client, request);
    case "languages":
      // languages payload is REST-crawl-shaped until github-api-fetch-policy T112 (`graphql.ts` `nodes(ids:)` batches of 100).
      return renderLanguages(client, request);
    default:
      throw new UnhandledGithubWidgetError(request.id);
  }
}

async function renderDemo(
  client: GithubClient,
  request: WidgetRenderRequest,
): Promise<WidgetRenderResult> {
  const options = demoOptions(request);
  return loadAndRender(
    client,
    request,
    payloadInput(request),
    async (payload) => {
      const copy = demoCopy(payload, options);
      const svg = await renderDemoSvg({
        text: copy.text,
        subtitle: copy.subtitle,
        theme: request.theme,
      });
      return rendered(request, `demo.${request.config.format}`, svg);
    },
  );
}

async function renderStats(
  client: GithubClient,
  request: WidgetRenderRequest,
): Promise<WidgetRenderResult> {
  const options = statsOptions(request);
  return loadAndRender(
    client,
    request,
    payloadInput(request, options),
    async (payload) => {
      const svg = await renderStatsSvg({
        payload,
        options,
        theme: request.theme,
        canContributions: request.capabilities.canContributions,
      });
      return rendered(
        request,
        `${options.filename}.${request.config.format}`,
        svg,
      );
    },
  );
}

async function renderLanguages(
  client: GithubClient,
  request: WidgetRenderRequest,
): Promise<WidgetRenderResult> {
  const options = languagesOptions(request);
  return loadAndRender(
    client,
    request,
    payloadInput(request, options),
    async (payload) => {
      const svg = await renderLanguagesSvg({
        payload,
        options,
        theme: request.theme,
      });
      return rendered(
        request,
        `${options.filename}.${request.config.format}`,
        svg,
      );
    },
  );
}

async function loadAndRender(
  client: GithubClient,
  request: WidgetRenderRequest,
  input: GithubPayloadInput,
  render: (payload: unknown) => Promise<WidgetRenderResult>,
): Promise<WidgetRenderResult> {
  try {
    const payload = await client.loadPayload(input);
    return await render(payload);
  } catch (error: unknown) {
    if (error instanceof GithubClientError && error.outcome === "fail_widget") {
      return { id: request.id, outcome: "fail_widget" };
    }
    throw error;
  }
}

function payloadInput(
  request: WidgetRenderRequest,
  options: {
    include_private?: boolean;
    include_forks?: boolean;
    include_archived?: boolean;
  } = {},
): GithubPayloadInput {
  return {
    user: request.inputs.user ?? "",
    widget: request.id,
    includePrivate: options.include_private ?? false,
    includeForks: options.include_forks ?? false,
    includeArchived: options.include_archived ?? false,
  };
}

function demoCopy(
  payload: unknown,
  options: DemoOptions,
): { text: string; subtitle?: string } {
  if (options.text !== "") {
    return options.subtitle === undefined
      ? { text: options.text }
      : { text: options.text, subtitle: options.subtitle };
  }
  const record =
    payload != null && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const demo =
    record.demo != null && typeof record.demo === "object"
      ? (record.demo as Record<string, unknown>)
      : record;
  const text =
    typeof demo.text === "string" && demo.text !== ""
      ? demo.text
      : "profile-bits";
  const subtitle =
    typeof demo.subtitle === "string" ? demo.subtitle : options.subtitle;
  return subtitle === undefined ? { text } : { text, subtitle };
}

function demoOptions(request: WidgetRenderRequest): DemoOptions {
  const options = request.options;
  if (!("text" in options) || "filename" in options) {
    throw new UnhandledGithubWidgetError(request.id);
  }
  return options;
}

function statsOptions(request: WidgetRenderRequest): StatsOptions {
  const options = request.options;
  if (!("hide_rank" in options)) {
    throw new UnhandledGithubWidgetError(request.id);
  }
  return options;
}

function languagesOptions(request: WidgetRenderRequest): LanguagesOptions {
  const options = request.options;
  if (!("min_pct" in options)) {
    throw new UnhandledGithubWidgetError(request.id);
  }
  return options;
}

function rendered(
  request: WidgetRenderRequest,
  path: string,
  contents: string,
): WidgetRenderResult {
  return {
    id: request.id,
    outcome: "render",
    files: [{ path, contents }],
  };
}
