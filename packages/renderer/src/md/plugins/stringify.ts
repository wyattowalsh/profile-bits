import rehypeStringify from "rehype-stringify";
import type { MdPluginDescriptor } from "../types.js";

export const rehypeStringifyPlugin: MdPluginDescriptor = {
  name: "rehype-stringify",
  npm: "rehype-stringify",
  use: rehypeStringify,
};
