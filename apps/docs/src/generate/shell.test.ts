import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  COPY_GENERATOR_LINK_LABEL,
  DEFAULT_GENERATE_REQUEST,
  DOWNLOAD_LABEL,
  GENERATE_PLUGIN_ID,
  GenerateShell,
  GLOBAL_BAR_MODULE,
  generatePath,
  importGlobalBar,
  importPackStage,
  PACK_STAGE_MODULE,
  requestFromPathname,
  resolveOrigin,
  SHARE_LABEL,
} from "@/src/generate/shell";
import {
  PREVIEW_BIT_IDS,
  PREVIEW_TOKEN_QUERY_KEYS,
  PREVIEW_WIDGET_IDS,
  type PreviewFile,
  type PreviewRequest,
} from "@/src/preview/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/generate/github",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: import("react").ReactNode;
  }) => createElement("a", { href, ...rest }, children),
}));

const PNG_FILE: PreviewFile = {
  id: "stats",
  mime: "image/png",
  bytesBase64: btoa("fake-png-bytes"),
  filename: "stats.png",
};

function shellSourceUrl(): URL {
  return new URL("./shell.tsx", import.meta.url);
}

function layoutSourceUrl(): URL {
  return new URL("../../app/generate/layout.tsx", import.meta.url);
}

function renderShell(props: Parameters<typeof GenerateShell>[0] = {}): string {
  return renderToStaticMarkup(
    createElement(GenerateShell, {
      PackStage: null,
      GlobalBar: null,
      ...props,
    }),
  );
}

function withLocationOrigin<T>(origin: string, run: () => T): T {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin },
  });
  try {
    return run();
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(globalThis, "location");
    } else {
      Object.defineProperty(globalThis, "location", previous);
    }
  }
}

describe("generate layout is a server module", () => {
  it("has no use client directive and wraps GenerateShell", async () => {
    const source = await readFile(layoutSourceUrl(), "utf8");

    expect(source).not.toMatch(/["']use client["']/);
    expect(source).toContain("GenerateShell");
    expect(source).toContain("HomeLayout");
    expect(source).toContain("Suspense");
    expect(source).toContain("children");
    expect(source).not.toContain("source-drop");
    expect(source).not.toMatch(/yaml/i);
  });
});

describe("generate shell is a client island", () => {
  it("starts with use client and never mounts source-drop or a yaml rail", async () => {
    const source = await readFile(shellSourceUrl(), "utf8");

    expect(source.startsWith('"use client"')).toBe(true);
    expect(source).toContain("usePathname");
    expect(source).toContain("useSearchParams");
    expect(source).toContain("requestFromPathname");
    expect(source).toContain("pickOptions");
    expect(source).toContain("PACK_STAGE_MODULE");
    expect(source).toContain("GLOBAL_BAR_MODULE");
    expect(PACK_STAGE_MODULE).toBe("./pack-stage");
    expect(GLOBAL_BAR_MODULE).toBe("../preview/global-bar");
    expect(source).toContain("fixture-pill");
    expect(source).toContain("cross-link");
    expect(source).not.toMatch(/from ["'][^"']*source-drop/);
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toContain("PackEmitter");
    expect(source).not.toMatch(/\bwakatime\b/i);
    expect(source).not.toMatch(/\brss\b/i);
  });
});

describe("v0 github pack", () => {
  it("locks the generate plugin to github", () => {
    expect(GENERATE_PLUGIN_ID).toBe("github");
    expect(DEFAULT_GENERATE_REQUEST.plugin).toBe("github");
    expect(generatePath(DEFAULT_GENERATE_REQUEST)).toBe("/generate/github");
  });

  it("stamps github on the shell and does not invent extra packs", () => {
    const html = renderShell();

    expect(html).toContain('data-plugin="github"');
    expect(html).toContain("<code>github</code>");
    expect(html).not.toMatch(/wakatime|gitlab/i);
  });
});

describe("480×160 hero", () => {
  it("locks the hero card at 480 by 160", () => {
    expect(CARD_WIDTH).toBe(480);
    expect(CARD_HEIGHT).toBe(160);
  });

  it("renders a 480×160 hero slot without a yaml rail", () => {
    const html = renderShell({ files: [PNG_FILE] });

    expect(html).toContain(`data-card-width="${CARD_WIDTH}"`);
    expect(html).toContain(`data-card-height="${CARD_HEIGHT}"`);
    expect(html).toContain(`width="${CARD_WIDTH}"`);
    expect(html).toContain(`height="${CARD_HEIGHT}"`);
    expect(html).toContain('data-slot="generate-hero"');
    expect(html).toContain('data-slot="generate-hero-fallback"');
    expect(html).toContain("stats.png");
    expect(html).not.toContain('data-slot="code-rail"');
    expect(html).not.toContain("source-drop");
    expect(html).not.toMatch(/Thin workflow YAML/);
  });
});

describe("primary Download Share and copy generator link", () => {
  it("renders Download as the primary CTA plus Share and copy generator link", () => {
    const html = renderShell({ files: [PNG_FILE] });

    expect(html).toContain(`data-slot="generate-download"`);
    expect(html).toContain('data-primary="true"');
    expect(html).toContain(`aria-label="${DOWNLOAD_LABEL}"`);
    expect(html).toContain(DOWNLOAD_LABEL);
    expect(html).toContain(`data-slot="generate-share"`);
    expect(html).toContain(`aria-label="${SHARE_LABEL}"`);
    expect(html).toContain(SHARE_LABEL);
    expect(html).toContain(COPY_GENERATOR_LINK_LABEL);
    expect(html).toContain('data-slot="copy-button"');
    expect(html).toContain('data-canonical-path="/generate/github"');
  });

  it("disables Download and Share when no preview file is present", () => {
    const html = renderShell({ files: [] });

    expect(html).toContain(`aria-label="${DOWNLOAD_LABEL}"`);
    expect(html).toContain("disabled");
    expect(html).toContain(COPY_GENERATOR_LINK_LABEL);
  });

  it("uses the same :focus-visible ring as CopyButton on Download and Share", async () => {
    const source = await readFile(shellSourceUrl(), "utf8");
    const copySource = await readFile(
      new URL("../preview/copy-button.tsx", import.meta.url),
      "utf8",
    );
    const ring = "outline: 2px solid var(--color-fd-ring, currentColor);";
    const offset = "outline-offset: 2px;";

    expect(copySource).toContain('[data-slot="copy-button"]:focus-visible');
    expect(copySource).toContain(ring);
    expect(copySource).toContain(offset);
    expect(source).toContain('[data-slot="generate-download"]:focus-visible');
    expect(source).toContain('[data-slot="generate-share"]:focus-visible');
    expect(source).toContain(ring);
    expect(source).toContain(offset);
    expect(resolveOrigin()).toBe("http://localhost:3000");
  });
});

describe("optional sibling chrome", () => {
  it("renders injected pack-stage and global-bar when provided", () => {
    const html = renderShell({
      PackStage: () =>
        createElement("div", { "data-slot": "pack-stage" }, "pack-stage"),
      GlobalBar: () =>
        createElement("div", { "data-slot": "global-bar" }, "global-bar"),
    });

    expect(html).toContain('data-slot="pack-stage"');
    expect(html).toContain('data-slot="global-bar"');
    expect(html).toContain("pack-stage");
    expect(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "")).not.toContain(
      'data-slot="generate-hero-fallback"',
    );
  });

  it("renders fixture-pill and a playground cross-link", () => {
    const html = renderShell({ provenance: "fixture" });

    expect(html).toContain('data-slot="fixture-pill"');
    expect(html).toContain("Using fixtures");
    expect(html).toContain('data-slot="cross-link"');
    expect(html).toContain("Open in Playground");
  });

  it("loads pack-stage and global-bar specifiers without throwing", async () => {
    await expect(importPackStage()).resolves.toBeDefined();
    await expect(importGlobalBar()).resolves.toBeDefined();
  });
});

describe("resolveOrigin", () => {
  it("defaults to http://localhost:3000 when origin and location are absent", () => {
    expect(resolveOrigin()).toBe("http://localhost:3000");
    expect(resolveOrigin("")).toBe("http://localhost:3000");
  });

  it("lets an explicit origin win", () => {
    expect(resolveOrigin("https://docs.example.com")).toBe(
      "https://docs.example.com",
    );
    withLocationOrigin("http://127.0.0.1:3000", () => {
      expect(resolveOrigin("https://docs.example.com")).toBe(
        "https://docs.example.com",
      );
    });
  });

  it("uses location.origin when set", () => {
    withLocationOrigin("http://127.0.0.1:3000", () => {
      expect(resolveOrigin()).toBe("http://127.0.0.1:3000");
    });
  });
});

describe("generatePath", () => {
  it("builds github widget and bit paths", () => {
    const widget: PreviewRequest = {
      ...DEFAULT_GENERATE_REQUEST,
      scope: "widget",
      plugin: "github",
      widget: "stats",
    };
    const bit: PreviewRequest = {
      ...DEFAULT_GENERATE_REQUEST,
      scope: "bit",
      bit: "Theme",
    };

    expect(generatePath(widget)).toBe("/generate/github/stats");
    expect(generatePath(bit)).toBe("/generate/bits/Theme");
  });
});

describe("requestFromPathname", () => {
  it("scopes /generate/github to the github plugin", () => {
    expect(requestFromPathname("/generate/github")).toEqual(
      DEFAULT_GENERATE_REQUEST,
    );
    expect(generatePath(requestFromPathname("/generate/github"))).toBe(
      "/generate/github",
    );
  });

  it.each(PREVIEW_WIDGET_IDS)(
    "scopes /generate/github/%s to that widget",
    (widget) => {
      const request = requestFromPathname(`/generate/github/${widget}`);

      expect(request).toEqual({
        ...DEFAULT_GENERATE_REQUEST,
        scope: "widget",
        plugin: GENERATE_PLUGIN_ID,
        widget,
      });
      expect(generatePath(request)).toBe(`/generate/github/${widget}`);
    },
  );

  it.each(PREVIEW_BIT_IDS)("scopes /generate/bits/%s to that bit", (bit) => {
    const request = requestFromPathname(`/generate/bits/${bit}`);

    expect(request).toEqual({
      ...DEFAULT_GENERATE_REQUEST,
      scope: "bit",
      plugin: GENERATE_PLUGIN_ID,
      bit,
    });
    expect(generatePath(request)).toBe(`/generate/bits/${bit}`);
  });

  it.each(["/generate/catalog", "/generate/bits", "/generate/widgets"])(
    "defaults index path %s to the github plugin request",
    (pathname) => {
      expect(requestFromPathname(pathname)).toEqual(DEFAULT_GENERATE_REQUEST);
    },
  );

  it("merges permalink query via parse and pickOptions", () => {
    const search = new URLSearchParams({
      format: "png",
      theme: "light",
      output_pair: "true",
      user: "hubot",
      options: JSON.stringify({ demo: { text: "profile-bits" } }),
    });
    const request = requestFromPathname("/generate/github/stats", search);

    expect(request.scope).toBe("widget");
    expect(request.plugin).toBe("github");
    expect(request.widget).toBe("stats");
    expect(request.format).toBe("png");
    expect(request.theme).toBe("light");
    expect(request.output_pair).toBe(true);
    expect(request.user).toBe("hubot");
    expect(request.options.demo).toEqual({ text: "profile-bits" });
  });

  it("strips token query keys and never puts them on the request", () => {
    const search = new URLSearchParams({
      format: "webp",
      user: "octocat",
    });
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      search.set(key, "secret-token-value");
    }

    const request = requestFromPathname("/generate/github", search);
    const serialized = JSON.stringify(request);

    expect(request.format).toBe("webp");
    expect(serialized).not.toContain("secret-token-value");
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(request).not.toHaveProperty(key);
    }
  });

  it("lets an explicit request prop override the pathname", () => {
    const request: PreviewRequest = {
      ...DEFAULT_GENERATE_REQUEST,
      scope: "bit",
      bit: "Divider",
    };
    const html = renderShell({ request });

    expect(html).toContain("/generate/bits/Divider");
    expect(html).not.toContain("/generate/github/demo");
  });
});
