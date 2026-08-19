import type { PluginIdentity } from "@profile-bits/core";

export const HTTP_BITS_USED = ["Theme", "Frame", "Muted", "Chip"] as const;

export const httpPlugin = {
  id: "http",
  title: "HTTP JSON",
  docsPath: "/playground/http",
  widgets: ["json", "chips"],
  integrations: ["http"],
  defaults: { widgets: ["json"] },
  bitsUsed: HTTP_BITS_USED,
} as const satisfies PluginIdentity & { bitsUsed: typeof HTTP_BITS_USED };
