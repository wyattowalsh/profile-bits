import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()}>
      <section className="docs-home">
        <h1>profile-bits</h1>
        <p>
          GitHub profile widget generator. A plugin is a pack of widgets plus
          declared integrations. First-party packs: <code>github</code> (
          <code>demo</code>, <code>stats</code>, <code>languages</code>),{" "}
          <code>wakatime</code> (<code>coding</code>), <code>rss</code> (
          <code>feed</code>), <code>http</code> (<code>json</code>,{" "}
          <code>chips</code>).
        </p>
        <p>
          README delivery is the Action (commit widget files).{" "}
          <code>just render</code> is a local engine runner, not a public embed
          API. Embed with relative <code>![](./profile-bits/…)</code>. Gist is
          an optional <code>output_action</code>, not a CDN. Customize via yaml
          plus first-party <code>http</code> / <code>rss</code> /{" "}
          <code>chips</code>, not a user plugin loader. Widget cards are{" "}
          <strong>480×160</strong>. Docs chrome is not the widget runtime —
          widgets render through Takumi, not Radix or shadcn DOM primitives.
        </p>
        <ul>
          <li>
            <a href="/playground">Playground</a> — layout preview +
            YAML/markdown codegen, not a public embed API.
          </li>
          <li>
            <a href="/generate">Generate</a> — visual catalog, export, and
            share.
          </li>
          <li>
            <a href="/generate/catalog">Catalog</a> — first-party visual
            gallery, not a plugin marketplace.
          </li>
          <li>
            <a href="/docs">Docs</a> — usage notes for the github pack.
          </li>
        </ul>
      </section>
    </HomeLayout>
  );
}
