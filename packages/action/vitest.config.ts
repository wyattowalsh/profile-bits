import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@profile-bits/core": fileURLToPath(
        new URL("../core/src/index.ts", import.meta.url),
      ),
      "@profile-bits/integrations": fileURLToPath(
        new URL("../integrations/src/index.ts", import.meta.url),
      ),
      "@profile-bits/plugins": fileURLToPath(
        new URL("../plugins/src/index.ts", import.meta.url),
      ),
      "@profile-bits/renderer": fileURLToPath(
        new URL("../renderer/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.ts"],
  },
});
