import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  FORMAT_FIELD_LABEL,
  formatPickerLabel,
  GLOBAL_BAR_FORMAT_LABELS,
  GLOBAL_BAR_LABEL,
  GlobalBar,
  type GlobalBarValue,
  OUTPUT_PAIR_FIELD_LABEL,
  THEME_FIELD_LABEL,
  USER_FIELD_LABEL,
} from "./global-bar";
import { PREVIEW_OUTPUT_FORMATS, PREVIEW_TOKEN_QUERY_KEYS } from "./types";

const SOURCE_URL = new URL("./global-bar.tsx", import.meta.url);

const VALUE: GlobalBarValue = {
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

function renderBar(
  value: GlobalBarValue = VALUE,
  onChange: (next: GlobalBarValue) => void = () => {},
): string {
  return renderToStaticMarkup(createElement(GlobalBar, { value, onChange }));
}

describe("GlobalBar", () => {
  it("renders format, theme, output_pair, and user controls", () => {
    const html = renderBar({
      format: "gif",
      theme: "light",
      output_pair: true,
      user: "octocat",
    });

    expect(html).toContain('data-slot="global-bar"');
    expect(html).toContain('role="toolbar"');
    expect(html).toContain(`aria-label="${GLOBAL_BAR_LABEL}"`);
    expect(html).toContain('data-slot="toggle-group"');
    expect(html).toContain('data-slot="field"');
    expect(html).toContain(FORMAT_FIELD_LABEL);
    expect(html).toContain(THEME_FIELD_LABEL);
    expect(html).toContain(OUTPUT_PAIR_FIELD_LABEL);
    expect(html).toContain(USER_FIELD_LABEL);
    expect(html).toContain('data-field="format"');
    expect(html).toContain('data-field="theme"');
    expect(html).toContain('data-field="output_pair"');
    expect(html).toContain('data-field="user"');
    expect(html).toContain('name="output_pair"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="user"');
    expect(html).toContain('value="octocat"');
  });

  it("format picker includes gif, apng, and animated webp plus stills", () => {
    const html = renderBar({ ...VALUE, format: "webp" });

    for (const format of PREVIEW_OUTPUT_FORMATS) {
      expect(html).toContain(`data-value="${format}"`);
      expect(html).toContain(formatPickerLabel(format));
    }
    expect(html).toContain("gif");
    expect(html).toContain("apng");
    expect(html).toContain("animated webp");
    expect(GLOBAL_BAR_FORMAT_LABELS.webp).toBe("animated webp");
    expect(PREVIEW_OUTPUT_FORMATS).toEqual(
      expect.arrayContaining(["gif", "apng", "webp"]),
    );
  });

  it("theme picker lists catalog families", () => {
    const html = renderBar({ ...VALUE, theme: "catppuccin-mocha" });
    expect(html).toContain('data-slot="theme-picker"');
    expect(html).toContain('data-slot="theme-combobox"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('data-value="catppuccin-mocha"');
    expect(html).toContain('data-family="catppuccin"');
    expect(html).toContain('data-value="dark"');
    expect(html).toContain('data-value="custom"');
    expect(html).toContain('data-swatch="bg"');
    expect(html).toContain('data-swatch="card"');
    expect(html).toContain('data-swatch="accent"');
  });

  it("pairs accessible labels with controls", () => {
    const html = renderBar({ ...VALUE, user: "hubot" });

    expect(html).toContain(`aria-label="${GLOBAL_BAR_LABEL}"`);
    expect(html).toContain('aria-labelledby="');
    expect(html).toContain('for="');
    expect(html).toContain('id="');
    expect(html).toMatch(/autocomplete="username"/i);
    expect(html).not.toContain('type="password"');
  });

  it("does not render token inputs, zip, Download, or Share", () => {
    const html = renderBar().toLowerCase();

    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(html).not.toContain(key);
    }
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("github_token");
    expect(html).not.toContain("committer_token");
    expect(html).not.toContain("wakatime_token");
    expect(html).not.toContain("zip");
    expect(html).not.toContain("download");
    expect(html).not.toContain("share");
  });

  it("is controlled through value and onChange", () => {
    const onChange = vi.fn();
    const html = renderBar(
      {
        format: "apng",
        theme: "light",
        output_pair: true,
        user: "hubot",
      },
      onChange,
    );

    expect(html).toContain('data-value="apng"');
    expect(html).toContain('data-value="light"');
    expect(html).toContain("checked");
    expect(html).toContain('value="hubot"');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("global-bar source contract", () => {
  it("uses ToggleGroup, PREVIEW_OUTPUT_FORMATS, and no token fields", async () => {
    const source = await readFile(SOURCE_URL, "utf8");

    expect(source.startsWith('"use client"')).toBe(true);
    expect(source).toContain('from "@/components/ui/toggle-group"');
    expect(source).toContain('from "@/components/ui/field"');
    expect(source).toContain('from "@/lib/utils"');
    expect(source).toContain("PREVIEW_OUTPUT_FORMATS");
    expect(source).toContain("ThemePicker");
    expect(source).toContain("ThemeMixer");
    expect(source).toContain("animated webp");
    expect(source).toContain("output_pair");
    expect(source).not.toContain('from "@/components/ui/tabs"');
    expect(source).not.toContain('from "./permalink"');
    expect(source).not.toContain("github_token");
    expect(source).not.toContain("committer_token");
    expect(source).not.toContain("wakatime_token");
    expect(source).not.toContain('type="password"');
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("prefers-reduced-motion");
  });
});
