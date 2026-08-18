import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** TypeScript ESM `.js` specifiers → `.ts` / `.tsx` / `.js` (NodeNext convention). */
const extensionAlias = {
  ".js": [".ts", ".tsx", ".js"],
  ".jsx": [".tsx", ".jsx"],
};

/**
 * Turbopack 16.3 has no `resolve.extensionAlias`. This CJS loader (no Node
 * imports) strips relative `./foo.js` specifiers so `.ts` files resolve.
 * Written at config load so OWN stays `next.config.mjs`.
 */
const turbopackJsExtLoader = path.join(
  os.tmpdir(),
  "profile-bits-ts-esm-loader.cjs",
);
fs.writeFileSync(
  turbopackJsExtLoader,
  '"use strict";\nmodule.exports = function (source) {\n  return String(source).replaceAll(\n    /(\\b(?:from|import)\\s*(?:\\(\\s*)?["\'](?:\\.\\.?\\/)[^"\']+?)\\.js(["\'])/g,\n    "$1$2",\n  );\n};\n',
);

const tsEsmLoaderRule = {
  condition: {
    path: /(?:^|\/)packages\/(?:core|integrations|bits|plugins|renderer)\//,
  },
  loaders: [turbopackJsExtLoader],
};

/** Harmless existing module; core's CLI barrel imports Node builtins. */
const browserEmpty = "next/dist/build/polyfills/object-assign.js";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  transpilePackages: [
    "@profile-bits/bits",
    "@profile-bits/core",
    "@profile-bits/integrations",
    "@profile-bits/plugins",
    "@profile-bits/renderer",
  ],
  experimental: {
    extensionAlias,
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ...extensionAlias,
    };
    return config;
  },
  turbopack: {
    root: repoRoot,
    resolveAlias: {
      "node:fs/promises": { browser: browserEmpty },
      "node:fs": { browser: browserEmpty },
      fs: { browser: browserEmpty },
      "node:path": { browser: browserEmpty },
      "node:url": { browser: browserEmpty },
    },
    rules: {
      "*.ts": tsEsmLoaderRule,
      "*.tsx": tsEsmLoaderRule,
    },
  },
  // Node runtime required for ImageResponse (Wave 3 preview). Do not set output: "export".
};

export default nextConfig;
