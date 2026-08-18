import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GitHub pack",
  description:
    "v0 first-party plugin github with widgets demo, stats, and languages. Cards are 480×160.",
};

export default function GitHubPackDocsPage() {
  return (
    <DocsPage toc={[]}>
      <DocsTitle>GitHub pack</DocsTitle>
      <DocsDescription>
        v0 ships one first-party plugin: github, with widgets demo, stats, and
        languages.
      </DocsDescription>
      <DocsBody>
        <p>
          Configure widgets in <code>.github/profile-bits.yml</code> and let the
          Action commit rendered files. Widget cards are{" "}
          <strong>480×160</strong>. Docs chrome (Fumadocs + shadcn + Tailwind)
          is not the README widget runtime — widgets render through Takumi (
          <code>renderSvg</code> / <code>render</code> /{" "}
          <code>renderAnimation</code>), not as a docs-chrome React tree.
        </p>
        <p>
          Use <a href="/playground">/playground</a> to emit thin workflow YAML,{" "}
          <code>.github/profile-bits.yml</code>, and README markdown.
        </p>
      </DocsBody>
    </DocsPage>
  );
}
