import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/**
 * Shared Fumadocs chrome. Nav hrefs are `/playground` and `/generate`
 * (T130a accept). Docs chrome is not the widget runtime.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "profile-bits",
      url: "/",
    },
    links: [
      {
        text: "Playground",
        url: "/playground",
      },
      {
        text: "Generate",
        url: "/generate",
      },
      {
        text: "Docs",
        url: "/docs",
      },
    ],
  };
}
