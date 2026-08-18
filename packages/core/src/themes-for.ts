import {
  resolveTheme,
  THEME_REGISTRY,
  type ThemeId,
  type ThemePalette,
} from "@profile-bits/themes";
import {
  type Config,
  type CustomRoleMap,
  isCustomThemeConfig,
  type ThemeConfig,
} from "./types.js";

export type ThemeMember = {
  polarity: "light" | "dark";
  theme: ThemeId | ThemePalette;
};

export function themesFor(
  config: Pick<Config, "theme" | "output_pair">,
): ThemeId[] {
  return themeMembersFor(config).map((member) => {
    if (typeof member.theme !== "string") {
      throw new Error("themesFor requires named catalog ids");
    }
    return member.theme;
  });
}

export function themeMembersFor(
  config: Pick<Config, "theme" | "output_pair">,
): ThemeMember[] {
  const members = allMembers(config.theme);
  if (!config.output_pair) {
    return [selectedMember(config.theme, members)];
  }
  return [...members].sort((left, right) =>
    left.polarity === right.polarity
      ? 0
      : left.polarity === "light"
        ? -1
        : 1,
  );
}

function allMembers(theme: ThemeConfig): ThemeMember[] {
  if (!isCustomThemeConfig(theme)) {
    const flavor = THEME_REGISTRY[theme];
    if (flavor === undefined) {
      throw new Error(`Unknown theme flavor "${theme}"`);
    }
    const pair = THEME_REGISTRY[flavor.pair];
    if (pair === undefined) {
      throw new Error(`Unknown theme pair "${flavor.pair}"`);
    }
    return [
      { polarity: flavor.polarity, theme: flavor.id },
      { polarity: pair.polarity, theme: pair.id },
    ];
  }

  const customPalette = resolveTheme(theme.custom, THEME_REGISTRY);
  const pair = theme.custom.pair;
  if (pair === undefined) {
    return [{ polarity: "dark", theme: customPalette }];
  }
  if (typeof pair === "string") {
    const pairFlavor = THEME_REGISTRY[pair];
    if (pairFlavor === undefined) {
      throw new Error(`Unknown theme flavor "${pair}"`);
    }
    return [
      { polarity: pairFlavor.polarity, theme: pair },
      {
        polarity: pairFlavor.polarity === "light" ? "dark" : "light",
        theme: customPalette,
      },
    ];
  }
  return [
    { polarity: "light", theme: resolveRoleMap(pair) },
    { polarity: "dark", theme: customPalette },
  ];
}

function selectedMember(
  theme: ThemeConfig,
  members: readonly ThemeMember[],
): ThemeMember {
  if (!isCustomThemeConfig(theme)) {
    const selected = members.find((member) => member.theme === theme);
    if (selected === undefined) {
      throw new Error(`Unknown theme flavor "${theme}"`);
    }
    return selected;
  }
  const custom = members.find((member) => typeof member.theme !== "string");
  if (custom !== undefined) {
    return custom;
  }
  return members[0] ?? { polarity: "dark", theme: resolveTheme("dark", THEME_REGISTRY) };
}

function resolveRoleMap(roles: CustomRoleMap): ThemePalette {
  return resolveTheme(roles, THEME_REGISTRY);
}
