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
    "Github pack usage: widgets demo, stats, and languages. Cards are 480×160. Other first-party packs: wakatime, rss, http.",
};

export default function GitHubPackDocsPage() {
  return (
    <DocsPage toc={[]}>
      <DocsTitle>GitHub pack</DocsTitle>
      <DocsDescription>
        Github pack widgets: demo, stats, and languages. Other first-party
        packs are wakatime (<code>coding</code>), rss (<code>feed</code>), and
        http (<code>json</code>, <code>chips</code>).
      </DocsDescription>
      <DocsBody>
        <p>
          Configure widgets in <code>.github/profile-bits.yml</code> and let the
          Action commit rendered files. <code>just render</code> is a local
          engine runner, not a public embed API. Embed with relative{" "}
          <code>![](./profile-bits/…)</code>. Gist is an optional{" "}
          <code>output_action</code>, not a CDN. Customize via yaml plus
          first-party <code>http</code> / <code>rss</code> /{" "}
          <code>chips</code>, not a user plugin loader. Widget cards are{" "}
          <strong>480×160</strong>. Docs chrome (Fumadocs + shadcn + Tailwind)
          is not the README widget runtime — widgets render through Takumi (
          <code>renderSvg</code> / <code>render</code> /{" "}
          <code>renderAnimation</code>), not as a docs-chrome React tree.
        </p>
        <p>
          Use <a href="/playground">/playground</a> to emit thin workflow YAML,{" "}
          <code>.github/profile-bits.yml</code>, and README markdown. The
          playground is layout preview only, not a public embed API.
        </p>
      </DocsBody>
    </DocsPage>
  );
}
