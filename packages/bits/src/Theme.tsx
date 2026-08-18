import {
  DARK_THEME,
  resolveWidgetTheme,
  type ThemePalette,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createContext, type ReactNode, useContext } from "react";

const ThemeContext = createContext<ThemePalette>(DARK_THEME);

export function useBitTheme(): ThemePalette {
  return useContext(ThemeContext);
}

export function Theme({
  theme = "dark",
  children,
}: {
  theme?: WidgetTheme;
  children?: ReactNode;
}) {
  const palette = resolveWidgetTheme(theme);
  return (
    <ThemeContext.Provider value={palette}>
      <div
        tw="w-full h-full flex"
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: palette.bg,
          color: palette.text,
          fontFamily: palette.font,
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
