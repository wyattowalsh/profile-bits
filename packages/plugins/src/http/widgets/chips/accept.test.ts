import { parseConfig } from "@profile-bits/core";
import {
  chipFixture,
  createHttpClient,
  expandChipsRequest,
  type HttpFetch,
  type HttpLookup,
} from "@profile-bits/integrations";
import { describe, expect, it, vi } from "vitest";
import { renderChipsFromClient } from "./index.js";

const PUBLIC_V4 = "93.184.216.34";

describe("chips widget acceptance", () => {
  it("parses yaml and renders 480×160 from injected fetch JSON", async () => {
    const config = parseConfig({
      yaml: `version: 1
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [npm, stars]
        package: react
        repo: vercel/next.js
`,
    });
    const chips = config.plugins.http?.widgets?.chips;
    expect(chips?.preset).toBe("shieldcn");
    expect(chips?.types).toEqual(["npm", "stars"]);
    expect(chips?.package).toBe("react");
    expect(chips?.repo).toBe("vercel/next.js");
    if (chips == null) {
      throw new Error("expected parsed chips options");
    }

    const npmUrl = expandChipsRequest({
      preset: chips.preset,
      type: "npm",
      user: "vercel",
      repo: chips.repo,
      packageName: chips.package,
    }).url.href;
    const starsUrl = expandChipsRequest({
      preset: chips.preset,
      type: "stars",
      user: "vercel",
      repo: chips.repo,
      packageName: chips.package,
    }).url.href;
    const bodies = new Map<string, unknown>([
      [npmUrl, chipFixture("shieldcn", "npm")],
      [starsUrl, chipFixture("shieldcn", "stars")],
    ]);

    const fetch = vi.fn<HttpFetch>(async (url) => {
      const body = bodies.get(url);
      if (body === undefined) {
        throw new Error(`unexpected url ${url}`);
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const lookup = vi.fn<HttpLookup>(async () => [
      { address: PUBLIC_V4, family: 4 },
    ]);
    const client = createHttpClient({ fetch, lookup });
    const svg = await renderChipsFromClient(client, chips, { user: "vercel" });

    expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
    expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
    expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
