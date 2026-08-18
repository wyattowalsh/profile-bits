import { readFile } from "node:fs/promises";
import { getPlaygroundFields } from "@profile-bits/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  applySchemaField,
  getFieldValue,
  SCHEMA_FORM_LABEL,
  SchemaForm,
  type SchemaFormValue,
  schemaFormFields,
  schemaFormGroups,
  setPathValue,
} from "./schema-form";

const SOURCE_URL = new URL("./schema-form.tsx", import.meta.url);

async function sourceText(): Promise<string> {
  return readFile(SOURCE_URL, "utf8");
}

function renderForm(
  value?: SchemaFormValue,
  onChange?: (next: SchemaFormValue) => void,
): string {
  return renderToStaticMarkup(
    createElement(
      SchemaForm,
      value === undefined && onChange === undefined ? {} : { value, onChange },
    ),
  );
}

describe("schemaFormFields", () => {
  it("comes from getPlaygroundFields and omits token paths", () => {
    const fromCore = getPlaygroundFields();
    const fields = schemaFormFields();
    const paths = fields.map((field) => field.path);

    expect(fields).toEqual(
      fromCore.filter(
        (field) => !/token/i.test(field.path) && !/token/i.test(field.label),
      ),
    );
    expect(paths.some((path) => /token/i.test(path))).toBe(false);
    expect(paths).not.toContain("github_token");
    expect(paths).not.toContain("committer_token");
    expect(new Set(fields.map((field) => field.group))).toEqual(
      new Set(["global", "demo", "stats", "languages"]),
    );
  });
});

describe("schemaFormGroups", () => {
  it("orders global, demo, stats, languages from field groups", () => {
    expect(schemaFormGroups()).toEqual([
      "global",
      "demo",
      "stats",
      "languages",
    ]);
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
  it("renders every getPlaygroundFields path with Form + Field chrome", () => {
    const html = renderForm();
    const fields = schemaFormFields();
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

    expect(html).toContain('data-group="demo"');
    expect(html).toContain('data-group="stats"');
    expect(html).toContain('data-group="languages"');
    expect(html).toContain('data-group="global"');

    for (const field of fields) {
      expect(html).toContain(`name="${field.path}"`);
      expect(html).toContain(`data-path="${field.path}"`);
      expect(html).toContain(field.label);
    }

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
  });

  it("renders enum options from getPlaygroundFields, not a hand list", () => {
    const html = renderForm();
    const fields = schemaFormFields().filter(
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

    expect(html).toContain('value="octocat"');
    expect(html).toContain('value="hello"');
    expect(html).toContain('name="theme"');
    expect(html).toContain('value="light"');
    expect(html).toContain('name="format"');
    expect(html).toContain('value="png"');
    expect(html).toContain('name="output_pair"');
    expect(onChange).not.toHaveBeenCalled();
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
    expect(source).not.toContain("wakatime");
    expect(source).not.toContain("PREVIEW_OUTPUT_FORMATS");
    expect(source).not.toContain("PREVIEW_STATS_INCLUDE");
    expect(source).not.toContain('["svg"');
    expect(source).not.toContain("followers");
    expect(source).not.toContain("include_private");
  });
});
