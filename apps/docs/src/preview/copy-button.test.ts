import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COPY_BUTTON_COPIED_LABEL,
  COPY_BUTTON_LABEL,
  CopyButton,
  copyText,
} from "./copy-button";

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    clipboard: { writeText },
  });
  return writeText;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("writes the given text to navigator.clipboard", async () => {
    const writeText = mockClipboard();
    const value = "name: profile-bits\n";

    await copyText(value);

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(value);
  });

  it("copies playground yaml, config, and readme payloads", async () => {
    const writeText = mockClipboard();

    await copyText("on:\n  schedule:\n");
    await copyText("plugin: github\n");
    await copyText("![stats](./profile-bits/stats.svg)");

    expect(writeText.mock.calls.map((call) => call[0])).toEqual([
      "on:\n  schedule:\n",
      "plugin: github\n",
      "![stats](./profile-bits/stats.svg)",
    ]);
  });
});

describe("CopyButton", () => {
  it("is a type=button control named Copy with no Download/Share", () => {
    const html = renderToStaticMarkup(
      createElement(CopyButton, { value: "plugin: github\n" }),
    );

    expect(html).toContain('type="button"');
    expect(html).toContain(`aria-label="${COPY_BUTTON_LABEL}"`);
    expect(html).toContain(COPY_BUTTON_LABEL);
    expect(html).toContain('data-slot="copy-button"');
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html).not.toContain(COPY_BUTTON_COPIED_LABEL);
  });

  it("click copies text through copyText(value) and clipboard.writeText", async () => {
    const source = await readFile(
      new URL("./copy-button.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("await copyText(value)");
    expect(source).toContain("navigator.clipboard.writeText(value)");
    expect(source).toContain("void handleClick(event)");

    const writeText = mockClipboard();
    const value = "jobs:\n  generate:\n";
    await copyText(value);
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(value);
  });
});
