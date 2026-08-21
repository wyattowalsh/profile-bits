/**
 * Action GFM plugin order. Must match ACTION_MD_PIPELINE
 * (parse → gfm → remark-rehype → sanitize → stringify). Must not import
 * processor.ts. Must not re-export from the renderer barrel.
 */
import { remarkGfmPlugin } from "./plugins/gfm.js";
import { remarkParsePlugin } from "./plugins/parse.js";
import { remarkRehypePlugin } from "./plugins/remark-rehype.js";
import { rehypeStringifyPlugin } from "./plugins/stringify.js";
import { rehypeSanitizePlugin } from "./sanitize.js";
import type { MdPluginDescriptor } from "./types.js";

export const ACTION_MD_PLUGINS: readonly MdPluginDescriptor[] = [
  remarkParsePlugin,
  remarkGfmPlugin,
  remarkRehypePlugin,
  rehypeSanitizePlugin,
  rehypeStringifyPlugin,
];
