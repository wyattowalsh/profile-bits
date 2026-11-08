import { readFile } from "node:fs/promises";
import { getPlaygroundFields } from "@profile-bits/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  applySchemaField,
  getFieldValue,
  SCHEMA_FORM_LABEL,
  SCHEMA_GROUPS_BY_PLUGIN,
  SchemaForm,
  type SchemaFormValue,
  schemaFormFields,
  schemaFormFieldsForPlugin,
  schemaFormGroups,
  setPathValue,
} from "./schema-form";
import type { PreviewPluginId } from "./types";

const SOURCE_URL = new URL("./schema-form.tsx", import.meta.url);

async function sourceText(): Promise<string> {
  return readFile(SOURCE_URL, "utf8");
}

function renderForm(
  value?: SchemaFormValue,
  onChange?: (next: SchemaFormValue) => void,
  plugin?: PreviewPluginId,
): string {
  return renderToStaticMarkup(
    createElement(SchemaForm, { value, onChange, plugin }),
  );
}

const GLOBAL_BAR_OWNED_PATHS = new Set([
  "format",
  "theme",
  "output_pair",
  "user",
]);

describe("schemaFormFields", () => {
  it("comes from getPlaygroundFields and omits tokens plus GlobalBar globals", () => {
    const fromCore = getPlaygroundFields();
    const fields = schemaFormFields();
    const paths = fields.map((field) => field.path);

    expect(fields).toEqual(
      fromCore.filter(
        (field) =>
          !/token/i.test(field.path) &&
          !/token/i.test(field.label) &&
          !GLOBAL_BAR_OWNED_PATHS.has(field.path) &&
          field.type !== "object",
      ),
    );
    expect(paths).not.toContain("json.headers");
    expect(paths.some((path) => /token/i.test(path))).toBe(false);
    expect(paths).not.toContain("github_token");
    expect(paths).not.toContain("committer_token");
    expect(paths).not.toContain("theme");
    expect(paths).not.toContain("format");
    expect(paths).not.toContain("output_pair");
    expect(paths).not.toContain("user");
    expect(paths).toContain("animated");
    expect(new Set(fields.map((field) => field.group))).toEqual(
      new Set([
        "global",
        "demo",
        "stats",
        "languages",
        "repo",
        "coding",
        "feed",
        "json",
        "chips",
      ]),
    );
  });
});

describe("schemaFormGroups", () => {
  it("orders widget groups from field groups", () => {
    expect(schemaFormGroups()).toEqual([
      "global",
      "demo",
      "stats",
      "languages",
      "repo",
      "coding",
      "feed",
      "json",
      "chips",
    ]);
  });
});

describe("schemaFormFieldsForPlugin", () => {
  it("keeps github tuners off coding/feed/json/chips", () => {
    expect(SCHEMA_GROUPS_BY_PLUGIN).toEqual({
      github: ["global", "demo", "stats", "languages", "repo"],
      wakatime: ["global", "coding"],
      rss: ["global", "feed"],
      http: ["global", "json", "chips"],
    });
    const paths = schemaFormFieldsForPlugin("github").map(
      (field) => field.path,
    );
    expect(paths).toContain("demo.text");
    expect(paths).toContain("repo.repo");
    expect(paths).not.toContain("coding.filename");
    expect(paths).not.toContain("feed.url");
    expect(paths).not.toContain("json.url");
    expect(paths).not.toContain("chips.preset");
    expect(schemaFormGroups(schemaFormFieldsForPlugin("github"))).toEqual([
      "global",
      "demo",
      "stats",
      "languages",
      "repo",
    ]);
  });

  it("scopes wakatime, rss, and http tuners to that pack", () => {
    expect(
      schemaFormFieldsForPlugin("wakatime").map((field) => field.group),
    ).toEqual(expect.arrayContaining(["global", "coding"]));
    expect(
      schemaFormFieldsForPlugin("wakatime").some((f) => f.group === "demo"),
    ).toBe(false);
    expect(
      schemaFormFieldsForPlugin("rss").some((f) => f.path === "feed.url"),
    ).toBe(true);
    expect(
      schemaFormFieldsForPlugin("http").some((f) => f.path === "chips.preset"),
    ).toBe(true);
    expect(
      schemaFormFieldsForPlugin("http").some((f) => f.path === "json.url"),
    ).toBe(true);
    expect(
      schemaFormFieldsForPlugin("http").some((f) => f.path === "json.headers"),
    ).toBe(false);
    expect(
      schemaFormFieldsForPlugin("http").some((f) => f.group === "repo"),
    ).toBe(false);
  });
});

describe("getFieldValue / applySchemaField", () => {
  it("reads and writes nested options compatible with PreviewRequest", () => {
    expect(getFieldValue({ user: "octocat" }, "user")).toBe("octocat");
    expect(
      getFieldValue({ options: { demo: { text: "nested" } } }, "demo.text"),
    ).toBe("nested");
    expect(getFieldValue(undefined, "user")).toBeUndefined();

    const next = applySchemaField(
      { user: "octocat", options: { demo: { text: "a" } } },
      "demo.text",
      "b",
    );
    expect(next.user).toBe("octocat");
    expect(next.options?.demo?.text).toBe("b");

    const globals = applySchemaField({ user: "octocat" }, "theme", "light");
    expect(globals.theme).toBe("light");
    expect(globals.user).toBe("octocat");
  });

  it("setPathValue writes dotted yaml paths", () => {
    const next = setPathValue({ demo: { text: "a" } }, "demo.text", "b");
    expect(next).toEqual({ demo: { text: "b" } });
  });
});

describe("SchemaForm", () => {
  it("renders schemaFormFields with Form + Field chrome, not GlobalBar globals", () => {
    const html = renderForm();
    const fields = schemaFormFieldsForPlugin("github");
    const pathAttrs = html.match(/data-path="[^"]+"/g) ?? [];

    expect(html).toContain("data-schema-form");
    expect(html).toContain('data-slot="schema-form"');
    expect(html).toContain('data-slot="form"');
    expect(html).toContain('data-slot="field"');
    expect(html).toContain('data-slot="field-group"');
    expect(html).toContain(`aria-label="${SCHEMA_FORM_LABEL}"`);
    expect(pathAttrs).toHaveLength(fields.length);

    for (const group of schemaFormGroups(fields)) {
      expect(html).toContain(`data-group="${group}"`);
    }

    expect(html).toContain('data-plugin="github"');
    expect(html).toContain('data-group="demo"');
    expect(html).toContain('data-group="stats"');
    expect(html).toContain('data-group="languages"');
    expect(html).toContain('data-group="repo"');
    expect(html).toContain('data-group="global"');
    expect(html).toContain('name="animated"');
    expect(html).not.toContain('data-group="coding"');
    expect(html).not.toContain('data-group="feed"');
    expect(html).not.toContain('data-group="json"');
    expect(html).not.toContain('data-group="chips"');

    for (const field of fields) {
      expect(html).toContain(`name="${field.path}"`);
      expect(html).toContain(`data-path="${field.path}"`);
      expect(html).toContain(field.label);
    }

    expect(html).not.toContain('name="theme"');
    expect(html).not.toContain('name="format"');
    expect(html).not.toContain('name="output_pair"');
    expect(html).not.toContain('name="user"');
    expect(html).not.toContain("github_token");
    expect(html).not.toContain("committer_token");
    expect(html).not.toContain('name="token"');
  });

  it("does not render token inputs or extra plugin packs", () => {
    const html = renderForm().toLowerCase();

    expect(html).not.toContain("github_token");
    expect(html).not.toContain("committer_token");
    expect(html).not.toContain("wakatime_token");
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("wakatime");
    expect(html).not.toContain('data-group="rss"');
    expect(html).not.toContain('data-group="feed"');
    expect(html).not.toContain("plugin_github_stats_include");
    expect(html).not.toContain("json.headers");
  });

  it("renders per-pack widget tuners from SCHEMA_GROUPS_BY_PLUGIN", () => {
    const wakatime = renderForm(undefined, undefined, "wakatime");
    const rss = renderForm(undefined, undefined, "rss");
    const http = renderForm(undefined, undefined, "http");

    expect(wakatime).toContain('data-plugin="wakatime"');
    expect(wakatime).toContain('data-group="coding"');
    expect(wakatime).toContain('name="coding.filename"');
    expect(wakatime).not.toContain('data-group="demo"');
    expect(wakatime).not.toContain('data-group="chips"');

    expect(rss).toContain('data-plugin="rss"');
    expect(rss).toContain('data-group="feed"');
    expect(rss).toContain('name="feed.url"');
    expect(rss).not.toContain('data-group="stats"');

    expect(http).toContain('data-plugin="http"');
    expect(http).toContain('data-group="json"');
    expect(http).toContain('data-group="chips"');
    expect(http).toContain('name="json.url"');
    expect(http).toContain('name="chips.preset"');
    expect(http).not.toContain('name="json.headers"');
    expect(http).not.toContain('data-group="repo"');
    expect(http).not.toContain("http_token");
  });

  it("renders enum options from getPlaygroundFields, not a hand list", () => {
    const html = renderForm();
    const fields = schemaFormFieldsForPlugin("github").filter(
      (field) => field.enum !== undefined && field.enum.length > 0,
    );

    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      for (const option of field.enum ?? []) {
        expect(html).toContain(`value="${option}"`);
      }
    }
  });

  it("is controlled through value and onChange with nested options", () => {
    const onChange = vi.fn();
    const html = renderForm(
      {
        user: "octocat",
        format: "png",
        theme: "light",
        output_pair: true,
        options: { demo: { text: "hello" } },
      },
      onChange,
    );

    expect(html).toContain('value="hello"');
    expect(html).toContain('name="demo.text"');
    expect(html).not.toContain('name="theme"');
    expect(html).not.toContain('value="light"');
    expect(html).not.toContain('name="format"');
    expect(html).not.toContain('name="output_pair"');
    expect(html).not.toContain('name="user"');
    expect(html).not.toContain('value="octocat"');
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not render a free-text theme field for a custom mix", () => {
    const html = renderForm({
      theme: {
        custom: {
          bg: "#1e1e2e",
          card: "#181825",
          text: "#cdd6f4",
          muted: "#a6adc8",
          accent: "#cba6f7",
          border: "#313244",
        },
      },
      options: { demo: { text: "hello" } },
    });

    expect(html).not.toContain('name="theme"');
    expect(html).not.toContain('data-path="theme"');
    expect(html).toContain('name="demo.text"');
    expect(html).toContain('value="hello"');
  });
});

describe("schema-form source contract", () => {
  it("imports getPlaygroundFields from @profile-bits/core", async () => {
    const source = await sourceText();
    expect(source).toContain('from "@profile-bits/core"');
    expect(source).toContain("getPlaygroundFields");
    expect(source).toContain("getPlaygroundFields()");
    expect(source).toContain("@/components/ui/form");
    expect(source).toContain("@/components/ui/field");
    expect(source).toContain('"use client"');
  });

  it("does not hand-copy option lists or token fields", async () => {
    const source = await sourceText();
    expect(source).not.toContain("github_token");
    expect(source).not.toContain("committer_token");
    expect(source).not.toContain("wakatime_token");
    expect(source).not.toContain("PREVIEW_OUTPUT_FORMATS");
    expect(source).not.toContain("PREVIEW_STATS_INCLUDE");
    expect(source).not.toContain('["svg"');
    expect(source).not.toContain("followers");
    expect(source).not.toContain("include_private");
  });
});
