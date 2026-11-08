import type { Node, WidgetTheme } from "@profile-bits/renderer";
import { fromJsx } from "@profile-bits/renderer";
import { createElement, type ReactElement } from "react";
import { demoTextFromPayload } from "./widgets/demo/render.js";
import { DemoWidget } from "./widgets/demo/widget.js";
import { languagesViewModel } from "./widgets/languages/view-model.js";
import { LanguagesWidget } from "./widgets/languages/widget.js";
import { repoViewModel } from "./widgets/repo/view-model.js";
import { RepoWidget } from "./widgets/repo/widget.js";
import { statsViewModel } from "./widgets/stats/view-model.js";
import { StatsWidget } from "./widgets/stats/widget.js";
import { topReposViewModel } from "./widgets/top-repos/view-model.js";
import { TopReposWidget } from "./widgets/top-repos/widget.js";

export type GithubPreviewTarget = {
  widget?: "demo" | "stats" | "languages" | "repo" | "top-repos";
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
    repo?: {
      include?: readonly (
        | "stars"
        | "forks"
        | "watchers"
        | "issues"
        | "license"
        | "language"
      )[];
      avatar?: boolean;
      repo?: string;
    };
    "top-repos"?: {
      limit?: number;
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
  if (input.widget === "repo") {
    const model = repoViewModel(input.payload, input.options?.repo ?? {});
    return createElement(RepoWidget, { ...model, theme });
  }
  if (input.widget === "top-repos") {
    const model = topReposViewModel(
      input.payload,
      input.options?.["top-repos"] ?? {},
    );
    return createElement(TopReposWidget, {
      items: model.items,
      empty: model.empty,
      theme,
    });
  }
  const demo = demoTextFromPayload(input.payload, input.options?.demo ?? {});
  return createElement(DemoWidget, { ...demo, theme });
}

export async function githubPreviewNode(
  input: GithubPreviewTarget,
): Promise<Node> {
  return fromJsx(githubPreviewElement(input));
}
