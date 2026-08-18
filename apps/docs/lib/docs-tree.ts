import type { Root } from "fumadocs-core/page-tree";

/** Minimal page tree until MDX content lands (T130c). */
export const docsTree: Root = {
  name: "Docs",
  children: [
    {
      type: "page",
      name: "GitHub pack",
      url: "/docs",
    },
  ],
};
