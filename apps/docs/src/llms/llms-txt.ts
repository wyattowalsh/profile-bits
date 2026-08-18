import {
  ACTION_CONFIG_PATH_DEFAULT,
  PluginsConfigSchema,
} from "@profile-bits/core";

/** Next.js public URL for the Fumadocs llms.txt stub. */
export const LLMS_TXT_URL = "/llms.txt";

type ZodUnwrappable = {
  shape?: Record<string, unknown>;
  unwrap?: () => unknown;
};

function zodObjectShape(schema: unknown): Record<string, unknown> {
  if (schema === null || typeof schema !== "object") {
    return {};
  }

  const candidate = schema as ZodUnwrappable;
  if (typeof candidate.unwrap === "function") {
    return zodObjectShape(candidate.unwrap());
  }
  if (candidate.shape !== undefined && typeof candidate.shape === "object") {
    return candidate.shape;
  }
  return {};
}

export type PluginWidgetEntry = {
  plugin: string;
  widgets: string[];
};

export function pluginWidgetEntriesFromSchemas(): PluginWidgetEntry[] {
  return Object.entries(zodObjectShape(PluginsConfigSchema)).map(
    ([plugin, pluginSchema]) => {
      const widgetsSchema = zodObjectShape(pluginSchema).widgets;
      return {
        plugin,
        widgets: Object.keys(zodObjectShape(widgetsSchema)),
      };
    },
  );
}

export function pluginIdsFromSchemas(): string[] {
  return pluginWidgetEntriesFromSchemas().map((entry) => entry.plugin);
}

export function githubWidgetIdsFromSchemas(): string[] {
  return (
    pluginWidgetEntriesFromSchemas().find((entry) => entry.plugin === "github")
      ?.widgets ?? []
  );
}

/**
 * Stub llms.txt: widget ids from plugin/widget option schemas, yaml SSOT,
 * thin Action, no flattened inputs. Not a dump of widget option fields.
 */
export function renderLlmsTxt(): string {
  const entries = pluginWidgetEntriesFromSchemas();
  const pluginSections = entries
    .map((entry) => {
      const widgetList = entry.widgets.map((id) => `- \`${id}\``).join("\n");
      return `### \`${entry.plugin}\`\n\n${widgetList}`;
    })
    .join("\n\n");

  return `# profile-bits

> GitHub profile widget generator. A plugin is a pack of widgets plus declared integrations.

README delivery is the Action (commit widget files). The docs playground is layout preview only, not a public embed API.

## Widgets

Widget ids come from plugin/widget option schemas (not a hand-copied option table):

${pluginSections}

## Configuration

Committed \`${ACTION_CONFIG_PATH_DEFAULT}\` is the config SSOT (\`additionalProperties: false\`). Widget options live in yaml and may change without a Marketplace input bump.

Root \`action.yml\` is thin: \`user\`, \`github_token\`, \`committer_token\`, \`config\`, \`output_action\`, \`dry_run\`, optional format/theme overrides, optional \`plugin_github\`. There are no flattened \`plugin_<plugin>_<widget>_<option>\` Action inputs (including \`plugin_github_stats_include\`).

## Docs

- [Docs](/docs): github pack usage
- [Playground](/playground): codegen (layout preview + YAML/markdown)
- [Generate](/generate): visual catalog, export, and share
`;
}
