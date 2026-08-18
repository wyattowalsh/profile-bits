import { useBitTheme } from "./Theme.js";

export function Divider() {
  const theme = useBitTheme();
  return (
    <div
      style={{
        width: "100%",
        height: 1,
        backgroundColor: theme.border,
      }}
    />
  );
}
