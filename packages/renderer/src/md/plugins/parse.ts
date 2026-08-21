import remarkParse from "remark-parse";
import type { MdPluginDescriptor } from "../types.js";

export const remarkParsePlugin: MdPluginDescriptor = {
  name: "remark-parse",
  npm: "remark-parse",
  use: remarkParse, // the remark-parse plugin
};
