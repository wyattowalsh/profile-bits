import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { container } from "@takumi-rs/helpers";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compiledStylesheets,
  FRAME_CLASS,
  STYLESHEET_IDS,
  STYLESHEETS,
  THEME_CLASS,
  THEME_DARK_CLASS,
  THEME_LIGHT_CLASS,
  THEME_STYLESHEET,
  themeTokenStylesheet,
  withClassName,
  withStylesheets,
  withTw,
} from "./stylesheets.js";
import { DARK_THEME, LIGHT_THEME } from "./themes.js";

const SOURCE = readFileSync(
  fileURLToPath(new URL("./stylesheets.ts", import.meta.url)),
  "utf8",
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withTw", () => {
  it("passes tw through onto a props bag", () => {
    const styled = withTw(
      { style: { display: "flex" } },
      "h-full w-full gap-2",
    );

    expect(styled.tw).toBe("h-full w-full gap-2");
    expect(styled.style).toEqual({ display: "flex" });
  });

  it("passes tw through onto a Takumi container node", () => {
    const node = withTw(
      container({
        style: { width: "100%", height: "100%", display: "flex" },
      }),
      "h-full w-full items-center",
    );

    expect(node.type).toBe("container");
    expect(node.tw).toBe("h-full w-full items-center");
    expect(node.style).toEqual({
      width: "100%",
      height: "100%",
      display: "flex",
    });
  });
});

describe("withClassName", () => {
  it("attaches className for stylesheet matching", () => {
    const node = withClassName({ id: "card" }, `${THEME_CLASS} ${FRAME_CLASS}`);

    expect(node.className).toBe("pb-theme pb-frame");
    expect(node.id).toBe("card");
  });
});

describe("stylesheets array", () => {
  it("compiledStylesheets is a nonempty CSS string array", () => {
    const sheets = compiledStylesheets();

    expect(Array.isArray(sheets)).toBe(true);
    expect(sheets.length).toBeGreaterThan(0);
    expect(sheets.every((sheet) => typeof sheet === "string")).toBe(true);
    expect(sheets).toEqual([THEME_STYLESHEET]);
  });

  it("includes Theme tokens and the frame class", () => {
    expect(THEME_STYLESHEET).toContain(`.${THEME_CLASS}`);
    expect(THEME_STYLESHEET).toContain(`.${THEME_DARK_CLASS}`);
    expect(THEME_STYLESHEET).toContain(`.${THEME_LIGHT_CLASS}`);
    expect(THEME_STYLESHEET).toContain(`.${FRAME_CLASS}`);
    expect(THEME_STYLESHEET).toContain(`--pb-bg: ${DARK_THEME.bg}`);
    expect(THEME_STYLESHEET).toContain(`--pb-card: ${DARK_THEME.card}`);
    expect(THEME_STYLESHEET).toContain(`--pb-text: ${DARK_THEME.text}`);
    expect(THEME_STYLESHEET).toContain(`--pb-muted: ${DARK_THEME.muted}`);
    expect(THEME_STYLESHEET).toContain(`--pb-accent: ${DARK_THEME.accent}`);
    expect(THEME_STYLESHEET).toContain(`--pb-border: ${DARK_THEME.border}`);
    expect(THEME_STYLESHEET).toContain(`--pb-font: ${DARK_THEME.font}`);
    expect(THEME_STYLESHEET).toContain(`--pb-bg: ${LIGHT_THEME.bg}`);
    expect(THEME_STYLESHEET).toContain("width: 100%");
    expect(THEME_STYLESHEET).toContain("height: 100%");
  });

  it("reserves empty slots for KaTeX, pretty-code, and callouts CSS", () => {
    expect(STYLESHEET_IDS).toEqual([
      "theme",
      "katex",
      "pretty-code",
      "callouts",
    ]);
    expect(STYLESHEETS.katex).toBe("");
    expect(STYLESHEETS["pretty-code"]).toBe("");
    expect(STYLESHEETS.callouts).toBe("");
    expect(compiledStylesheets()).not.toContain("");
  });

  it("appends extra compiled CSS without dropping the theme fixture", () => {
    const extra = ".pb-chip { border-radius: 9999px; }";
    const sheets = compiledStylesheets([extra]);

    expect(sheets).toEqual([THEME_STYLESHEET, extra]);
  });

  it("withStylesheets attaches the compiled array onto render options", () => {
    const extra = ".card { display: flex; }";
    const options = withStylesheets({ width: 480, height: 160 }, [
      THEME_STYLESHEET,
      extra,
    ]);

    expect(options).toEqual({
      width: 480,
      height: 160,
      stylesheets: [THEME_STYLESHEET, extra],
    });
  });

  it("withStylesheets defaults to compiledStylesheets()", () => {
    const options = withStylesheets({ format: "png" });

    expect(options.stylesheets).toEqual(compiledStylesheets());
    expect(options.format).toBe("png");
  });

  it("themeTokenStylesheet compiles a palette onto a selector", () => {
    const css = themeTokenStylesheet(DARK_THEME, ".pb-theme");

    expect(css.startsWith(".pb-theme {")).toBe(true);
    expect(css).toContain(`--pb-bg: ${DARK_THEME.bg}`);
    expect(css).toContain("background-color: var(--pb-bg)");
  });
});

describe("no network", () => {
  it("does not import googleFonts or call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    withTw({ type: "container" }, "flex");
    withClassName({}, THEME_CLASS);
    withStylesheets({}, compiledStylesheets([".extra { color: red; }"]));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(SOURCE).not.toMatch(/googleFonts/);
    expect(SOURCE).not.toMatch(/\bfetch\s*\(/);
    expect(SOURCE).not.toMatch(/tailwindcss/);
    expect(SOURCE).not.toMatch(/@tailwindcss/);
  });
});
