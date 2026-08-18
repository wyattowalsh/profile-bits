import { Frame, Muted, Stack, Text, Theme } from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";

export function DemoWidget({
  text,
  subtitle,
  theme = "dark",
}: {
  text: string;
  subtitle?: string;
  theme?: WidgetTheme;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        <Stack gap={4}>
          <Text size={20}>{text}</Text>
          {subtitle !== undefined && subtitle !== "" ? (
            <Muted>{subtitle}</Muted>
          ) : null}
        </Stack>
      </Frame>
    </Theme>
  );
}
