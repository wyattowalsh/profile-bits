import type { HttpClient } from "@profile-bits/integrations";
import { renderSvg } from "@profile-bits/renderer";
import type { ThemePalette } from "@profile-bits/themes";
import { isEmptyJsonResult, JsonJmesError, searchJson } from "./jmes.js";
import { jsonTemplate } from "./template.js";

export class JsonWidgetError extends Error {
  override readonly name = "JsonWidgetError";
  readonly outcome = "fail_widget" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export async function renderJsonSvg(input: {
  value: unknown;
  url?: string;
  empty?: boolean;
  theme?: ThemePalette;
}): Promise<string> {
  const empty = input.empty ?? isEmptyJsonResult(input.value);
  return renderSvg(
    jsonTemplate({
      value: input.value,
      empty,
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
    }),
  );
}

/** Widget-side JMESPath reader. MUST NOT filter the http client dump. */
export function readJsonDump(payload: unknown, jmespath: string): unknown {
  return searchJson(payload, jmespath);
}

/** Consume a cached http JSON payload. The widget performs no HTTP. */
export async function renderJsonFromPayload(input: {
  payload: unknown;
  jmespath: string;
  url?: string;
  theme?: ThemePalette;
}): Promise<string> {
  let value: unknown;
  try {
    value = readJsonDump(input.payload, input.jmespath);
  } catch (error: unknown) {
    const message =
      error instanceof JsonJmesError ? error.message : "invalid jmespath";
    throw new JsonWidgetError(message, { cause: error });
  }
  return renderJsonSvg({
    value,
    ...(input.url !== undefined ? { url: input.url } : {}),
    ...(input.theme !== undefined ? { theme: input.theme } : {}),
  });
}

/** Cached full JSON dump. `jmespath` stays a widget reader, not a fetch filter. */
export async function loadJsonPayload(
  client: HttpClient,
  request: {
    url: string;
    timeout_ms?: number;
    headers?: Readonly<Record<string, string>>;
  },
): Promise<unknown> {
  return client.fetchJson({
    url: request.url,
    ...(request.timeout_ms !== undefined
      ? { timeout_ms: request.timeout_ms }
      : {}),
    ...(request.headers !== undefined ? { headers: request.headers } : {}),
  });
}

export async function renderJsonFromClient(
  client: HttpClient,
  input: {
    url: string;
    jmespath: string;
    timeout_ms?: number;
    headers?: Readonly<Record<string, string>>;
    theme?: ThemePalette;
  },
): Promise<string> {
  const payload = await loadJsonPayload(client, {
    url: input.url,
    ...(input.timeout_ms !== undefined ? { timeout_ms: input.timeout_ms } : {}),
    ...(input.headers !== undefined ? { headers: input.headers } : {}),
  });
  return renderJsonFromPayload({
    payload,
    jmespath: input.jmespath,
    url: input.url,
    ...(input.theme !== undefined ? { theme: input.theme } : {}),
  });
}

export { formatJsonRows, isEmptyJsonResult, searchJson } from "./jmes.js";
export { jsonHostnameLabel, jsonTemplate, NO_JSON_DATA } from "./template.js";
