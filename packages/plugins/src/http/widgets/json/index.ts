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
      url: input.url,
      theme: input.theme,
    }),
  );
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
    value = searchJson(input.payload, input.jmespath);
  } catch (error: unknown) {
    const message =
      error instanceof JsonJmesError ? error.message : "invalid jmespath";
    throw new JsonWidgetError(message, { cause: error });
  }
  return renderJsonSvg({
    value,
    url: input.url,
    theme: input.theme,
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
  const payload = await client.fetchJson({
    url: input.url,
    timeout_ms: input.timeout_ms,
    headers: input.headers,
  });
  return renderJsonFromPayload({
    payload,
    jmespath: input.jmespath,
    url: input.url,
    theme: input.theme,
  });
}

export { formatJsonRows, isEmptyJsonResult, searchJson } from "./jmes.js";
export { jsonHostnameLabel, jsonTemplate, NO_JSON_DATA } from "./template.js";
