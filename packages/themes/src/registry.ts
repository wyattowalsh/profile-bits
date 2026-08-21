import { AYU_FLAVORS } from "./families/ayu.ts";
import { BLULOCO_FLAVORS } from "./families/bluloco.ts";
import { CATPPUCCIN_FLAVORS } from "./families/catppuccin.ts";
import { DRACULA_FLAVORS } from "./families/dracula.ts";
import { EVERFOREST_FLAVORS } from "./families/everforest.ts";
import { FLEXOKI_FLAVORS } from "./families/flexoki.ts";
import { GITHUB_FLAVORS } from "./families/github.ts";
import { GRUVBOX_FLAVORS } from "./families/gruvbox.ts";
import { HORIZON_FLAVORS } from "./families/horizon.ts";
import { ICEBERG_FLAVORS } from "./families/iceberg.ts";
import { KANAGAWA_FLAVORS } from "./families/kanagawa.ts";
import { NIGHT_OWL_FLAVORS } from "./families/night-owl.ts";
import { NIGHTFOX_FLAVORS } from "./families/nightfox.ts";
import { NORD_FLAVORS } from "./families/nord.ts";
import { ONE_FLAVORS } from "./families/one.ts";
import { PAPERCOLOR_FLAVORS } from "./families/papercolor.ts";
import { ROSE_PINE_FLAVORS } from "./families/rose-pine.ts";
import { SOLARIZED_FLAVORS } from "./families/solarized.ts";
import { TOKYO_NIGHT_FLAVORS } from "./families/tokyo-night.ts";
import type { ThemeFlavor, ThemeRegistry } from "./types.ts";

const FAMILY_FLAVORS: readonly (readonly ThemeFlavor[])[] = [
  GITHUB_FLAVORS,
  CATPPUCCIN_FLAVORS,
  ROSE_PINE_FLAVORS,
  NORD_FLAVORS,
  DRACULA_FLAVORS,
  GRUVBOX_FLAVORS,
  TOKYO_NIGHT_FLAVORS,
  SOLARIZED_FLAVORS,
  ONE_FLAVORS,
  AYU_FLAVORS,
  EVERFOREST_FLAVORS,
  KANAGAWA_FLAVORS,
  FLEXOKI_FLAVORS,
  NIGHTFOX_FLAVORS,
  ICEBERG_FLAVORS,
  NIGHT_OWL_FLAVORS,
  HORIZON_FLAVORS,
  BLULOCO_FLAVORS,
  PAPERCOLOR_FLAVORS,
];

function registerFlavors(
  families: readonly (readonly ThemeFlavor[])[],
): ThemeRegistry {
  const registry: Record<string, ThemeFlavor> = {};
  for (const flavors of families) {
    for (const flavor of flavors) {
      if (registry[flavor.id]) {
        throw new Error(`Duplicate theme flavor id "${flavor.id}"`);
      }
      registry[flavor.id] = flavor;
    }
  }
  return registry;
}

export const THEME_REGISTRY: ThemeRegistry = registerFlavors(FAMILY_FLAVORS);

export const NAMED_THEME_IDS = Object.freeze(
  Object.keys(THEME_REGISTRY).sort(),
) as readonly [string, ...string[]];
