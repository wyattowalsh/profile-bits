import { parseConfig } from "@profile-bits/core";
import {
  createHttpClient,
  type HttpFetch,
  type HttpLookup,
} from "@profile-bits/integrations";
import { describe, expect, it, vi } from "vitest";
import { renderJsonFromClient } from "./index.js";

const PUBLIC_V4 = "93.184.216.34";
const FIXTURE_URL = "https://example.com/api.json";

describe("json widget acceptance", () => {
  it("parses yaml and renders 480×160 from injected fetch JSON", async () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  http:
    widgets:
      json:
        url: ${FIXTURE_URL}
        headers:
          X-Profile-Bits: test
`,
    });
    const json = config.plugins.http?.widgets?.json;
    expect(json?.url).toBe(FIXTURE_URL);
    expect(json?.headers).toEqual({ "X-Profile-Bits": "test" });

    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.["X-Profile-Bits"]).toBe("test");
      return new Response(JSON.stringify({ name: "octocat", n: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const lookup = vi.fn<HttpLookup>(async () => [
      { address: PUBLIC_V4, family: 4 },
    ]);
    const client = createHttpClient({ fetch, lookup });
    const svg = await renderJsonFromClient(client, {
      url: json?.url ?? FIXTURE_URL,
      jmespath: json?.jmespath ?? "@",
      timeout_ms: json?.timeout_ms,
      headers: json?.headers,
    });

    expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
    expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
