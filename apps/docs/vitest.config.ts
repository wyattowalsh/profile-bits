import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  resolve: {
    alias: {
      "@": root,
      "@profile-bits/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
      "@profile-bits/integrations": fileURLToPath(
        new URL("../../packages/integrations/src/index.ts", import.meta.url),
      ),
      "@profile-bits/bits": fileURLToPath(
        new URL("../../packages/bits/src/index.ts", import.meta.url),
      ),
      "@profile-bits/plugins": fileURLToPath(
        new URL("../../packages/plugins/src/index.ts", import.meta.url),
      ),
      "@profile-bits/renderer": fileURLToPath(
        new URL("../../packages/renderer/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
      "app/**/*.spec.ts",
    ],
  },
});
