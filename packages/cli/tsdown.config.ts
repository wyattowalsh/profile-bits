import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/bin.ts"],
  format: ["esm"],
  platform: "node",
  sourcemap: true,
  dts: false,
  external: [/^@profile-bits\//, /^@optique\//, "@clack/prompts", "zod"],
});
