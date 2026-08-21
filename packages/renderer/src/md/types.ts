/**
 * Descriptor for a markdown pipeline plugin. `{ name, npm, use }` only.
 * Must not import processor.ts. Action ships GFM; mermaid/shiki/katex are
 * later extras and must not appear in Action ncc.
 */
export type MdPluginDescriptor = {
  name: string;
  npm: string;
  use: unknown;
};
