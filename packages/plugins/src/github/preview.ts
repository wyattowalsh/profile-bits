import type { Node, WidgetTheme } from "@profile-bits/renderer";
import { fromJsx } from "@profile-bits/renderer";
import { createElement, type ReactElement } from "react";
import { demoTextFromPayload } from "./widgets/demo/render.js";
import { DemoWidget } from "./widgets/demo/widget.js";
import { languagesViewModel } from "./widgets/languages/view-model.js";
import { LanguagesWidget } from "./widgets/languages/widget.js";
import { statsViewModel } from "./widgets/stats/view-model.js";
import { StatsWidget } from "./widgets/stats/widget.js";

export type GithubPreviewTarget = {
  widget?: "demo" | "stats" | "languages";
  theme?: WidgetTheme;
  payload?: unknown;
  options?: {
    demo?: { text?: string; subtitle?: string };
    stats?: {
      include?: readonly (
        | "followers"
        | "following"
        | "repos"
        | "stars"
        | "forks"
        | "gists"
        | "contributions"
      )[];
      avatar?: boolean;
    };
    languages?: {
      limit?: number;
      min_pct?: number;
      exclude?: readonly string[];
    };
  };
  canContributions?: boolean;
};

export function githubPreviewElement(input: GithubPreviewTarget): ReactElement {
  const theme = input.theme ?? "dark";
  if (input.widget === "stats") {
    const model = statsViewModel(
      input.payload,
      input.options?.stats ?? {},
      input.canContributions === true,
    );
    return createElement(StatsWidget, { ...model, theme });
  }
  if (input.widget === "languages") {
    const model = languagesViewModel(
      input.payload,
      input.options?.languages ?? {},
    );
    return createElement(LanguagesWidget, { ...model, theme });
  }
  const demo = demoTextFromPayload(input.payload, input.options?.demo ?? {});
  return createElement(DemoWidget, { ...demo, theme });
}

export async function githubPreviewNode(
  input: GithubPreviewTarget,
): Promise<Node> {
  return fromJsx(githubPreviewElement(input));
}
