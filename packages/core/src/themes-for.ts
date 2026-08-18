import {
  contrastRatio,
  resolveTheme,
  THEME_REGISTRY,
  type ThemeId,
  type ThemePalette,
} from "@profile-bits/themes";
import {
  type Config,
  type CustomRoleMap,
  type CustomThemeConfig,
  isCustomThemeConfig,
} from "./types.js";

type ThemePolarity = "light" | "dark";

export type ThemeMember = {
  polarity: ThemePolarity;
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
  if (!isCustomThemeConfig(config.theme)) {
    return namedMembers(config.theme, config.output_pair);
  }
  const { selected, pair } = customMembers(config.theme);
  if (!config.output_pair) {
    return [selected];
  }
  if (pair === undefined) {
    throw new Error("Custom theme requires pair when output_pair is true");
  }
  return [selected, pair].sort((left, right) =>
    left.polarity === right.polarity ? 0 : left.polarity === "light" ? -1 : 1,
  );
}

function namedMembers(theme: string, outputPair: boolean): ThemeMember[] {
  const flavor = THEME_REGISTRY[theme];
  if (flavor === undefined) {
    throw new Error(`Unknown theme flavor "${theme}"`);
  }
  const selected: ThemeMember = {
    polarity: flavor.polarity,
    theme: flavor.id,
  };
  if (!outputPair) {
    return [selected];
  }
  const pair = THEME_REGISTRY[flavor.pair];
  if (pair === undefined) {
    throw new Error(`Unknown theme pair "${flavor.pair}"`);
  }
  return [
    { polarity: flavor.polarity, theme: flavor.id },
    { polarity: pair.polarity, theme: pair.id },
  ].sort((left, right) =>
    left.polarity === right.polarity ? 0 : left.polarity === "light" ? -1 : 1,
  );
}

function customMembers(theme: CustomThemeConfig): {
  selected: ThemeMember;
  pair?: ThemeMember;
} {
  const customPalette = resolveTheme(theme.custom, THEME_REGISTRY);
  const pair = theme.custom.pair;
  if (pair === undefined) {
    return {
      selected: {
        polarity: polarityFromBg(customPalette.bg),
        theme: customPalette,
      },
    };
  }
  if (typeof pair === "string") {
    const pairFlavor = THEME_REGISTRY[pair];
    if (pairFlavor === undefined) {
      throw new Error(`Unknown theme flavor "${pair}"`);
    }
    return {
      selected: {
        polarity: oppositePolarity(pairFlavor.polarity),
        theme: customPalette,
      },
      pair: { polarity: pairFlavor.polarity, theme: pair },
    };
  }
  const pairPalette = resolveRoleMap(pair);
  const selectedPolarity = polarityFromBg(customPalette.bg);
  const pairPolarity = polarityFromBg(pairPalette.bg);
  if (selectedPolarity === pairPolarity) {
    throw new Error(
      "Custom pair map must have the opposite polarity of the selected mix",
    );
  }
  return {
    selected: { polarity: selectedPolarity, theme: customPalette },
    pair: { polarity: pairPolarity, theme: pairPalette },
  };
}

function polarityFromBg(bg: string): ThemePolarity {
  const vsWhite = contrastRatio(bg, "#ffffff");
  const vsBlack = contrastRatio(bg, "#000000");
  if (vsWhite === vsBlack) {
    throw new Error("Unable to determine theme polarity from background");
  }
  return vsWhite < vsBlack ? "light" : "dark";
}

function oppositePolarity(polarity: ThemePolarity): ThemePolarity {
  return polarity === "light" ? "dark" : "light";
}

function resolveRoleMap(roles: CustomRoleMap): ThemePalette {
  return resolveTheme(roles, THEME_REGISTRY);
}
