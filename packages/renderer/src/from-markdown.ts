import { fromHtml } from "./from-html.js";
import { markdownToHtml } from "./md/processor.js";
import { renderSvg } from "./render-svg.js";

/** GFM markdown → sanitized HTML → Takumi node → baked-still SVG. */
export async function fromMarkdown(source: string): Promise<string> {
  const html = await markdownToHtml(source);
  return renderSvg(fromHtml(html));
}
