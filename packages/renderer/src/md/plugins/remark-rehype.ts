import remarkRehype from "remark-rehype";
import type { MdPluginDescriptor } from "../types.js";

/**
 * mdast → hast. `allowDangerousHtml: true` is required; sanitize is later.
 */
export const remarkRehypePlugin: MdPluginDescriptor = {
  name: "remark-rehype",
  npm: "remark-rehype",
  use: [remarkRehype, { allowDangerousHtml: true }],
};
