import type { Metadata } from "next";
import {
  DEFAULT_GENERATE_REQUEST,
  DOWNLOAD_LABEL,
  GENERATE_PLUGIN_ID,
  SHARE_LABEL,
} from "@/src/generate/constants";
import { PREVIEW_WIDGET_IDS, type PreviewRequest } from "@/src/preview/types";

export const GITHUB_GENERATE_HREF = `/generate/${GENERATE_PLUGIN_ID}`;

export const metadata: Metadata = {
  title: "Generate · github",
  description:
    "Visual generator for the github pack (demo, stats, languages). Download or share a 480×160 card.",
};

/** Canonical `/generate/github` pack request. v0 github only. */
export function githubPackRequest(): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "plugin",
    plugin: GENERATE_PLUGIN_ID,
  };
}

/** Canonical `/generate/github` visual generator. v0 github pack only. */
export default function GenerateGitHubPage() {
  return (
    <section
      data-slot="generate-github"
      data-plugin={GENERATE_PLUGIN_ID}
      data-href={GITHUB_GENERATE_HREF}
    >
      <h2>{GENERATE_PLUGIN_ID}</h2>
      <p>
        Visual generator for the <code>{GENERATE_PLUGIN_ID}</code> pack. Widgets{" "}
        {PREVIEW_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Primary actions are {DOWNLOAD_LABEL} and {SHARE_LABEL}.
      </p>
    </section>
  );
}
