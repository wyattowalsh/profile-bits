import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment:     "node",
    passWithNoTests: true,
    include:         ["packages/**/*.test.ts", "**/*.spec.ts"],
    // `packages/*/vitest.config.ts` throws while those files are absent
    // (T030b / T100). Folder globs still load nested vitest.config.ts.
    projects:        ["packages/*"],
  },
});
