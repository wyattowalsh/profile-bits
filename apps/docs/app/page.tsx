import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()}>
      <section className="docs-home">
        <h1>profile-bits</h1>
        <p>
          GitHub profile widget generator. A plugin is a pack of widgets plus
          declared integrations. The v0 first-party pack is <code>github</code>{" "}
          only (<code>demo</code>, <code>stats</code>, <code>languages</code>).
        </p>
        <p>
          README delivery is the Action (commit widget files). Widget cards are{" "}
          <strong>480×160</strong>. Docs chrome is not the widget runtime —
          widgets render through Takumi, not Radix or shadcn DOM primitives.
        </p>
        <ul>
          <li>
            <a href="/playground">Playground</a> — codegen (layout preview +
            YAML/markdown).
          </li>
          <li>
            <a href="/generate">Generate</a> — visual catalog, export, and
            share.
          </li>
          <li>
            <a href="/docs">Docs</a> — usage notes for the github pack.
          </li>
        </ul>
      </section>
    </HomeLayout>
  );
}
