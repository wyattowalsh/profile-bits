import rehypeSanitize from "rehype-sanitize";
import type { MdPluginDescriptor } from "./types.js";

export const rehypeSanitizePlugin: MdPluginDescriptor = {
  name: "rehype-sanitize",
  npm: "rehype-sanitize",
  use: rehypeSanitize,
};
