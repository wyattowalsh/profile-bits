/**
 * Action GFM processor. Catalog order is ACTION_MD_PIPELINE.
 * Markdown → HTML only; fromHtml / renderSvg live in from-markdown.
 * Do not attach mermaid/shiki/katex. Do not re-export from the barrel.
 */
import type { Plugin, Processor } from "unified";
import { unified } from "unified";
import { ACTION_MD_PLUGINS } from "./catalog.js";
import { assertNoMermaidFence } from "./parse-fail.js";
import type { MdPluginDescriptor } from "./types.js";

function applyPlugin(processor: Processor, descriptor: MdPluginDescriptor) {
  const use = descriptor.use;
  if (Array.isArray(use)) {
    return processor.use(use[0] as Plugin<[unknown]>, use[1]);
  }
  return processor.use(use as Plugin);
}

export async function markdownToHtml(source: string): Promise<string> {
  assertNoMermaidFence(source);
  const processor = unified();
  for (const descriptor of ACTION_MD_PLUGINS) {
    applyPlugin(processor, descriptor);
  }
  return String(await processor.process(source));
}
