import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HTML_FIXTURE_NAMES = [
  "public.html",
  "login-wall.html",
  "challenge.html",
  "malformed.html",
] as const;

export type HtmlFixtureName = (typeof HTML_FIXTURE_NAMES)[number];

export function htmlFixturePath(name: HtmlFixtureName): string {
  return join(dirname(fileURLToPath(import.meta.url)), "fixtures", name);
}

export function loadFixture(name: HtmlFixtureName): string {
  return readFileSync(htmlFixturePath(name), "utf8");
}
