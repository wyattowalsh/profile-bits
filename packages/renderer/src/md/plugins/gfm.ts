import remarkGfm from "remark-gfm";
import type { MdPluginDescriptor } from "../types.js";

/**
 * Two-element `use` so the processor can `.use(plugin, options)`.
 * `singleTilde: false` is GitHub strikethrough (`~~`, not `~`).
 */
export const remarkGfmPlugin: MdPluginDescriptor = {
  name: "remark-gfm",
  npm: "remark-gfm",
  use: [remarkGfm, { singleTilde: false }],
};
