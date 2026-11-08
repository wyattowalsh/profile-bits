import { Frame, List, Muted, Stack, Text, Theme } from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";

export const NO_REPOSITORIES = "No repositories";

export type TopReposItem = {
  title: string;
  meta: string;
};

export function TopReposWidget({
  items,
  empty = false,
  theme = "dark",
}: {
  items: readonly TopReposItem[];
  empty?: boolean;
  theme?: WidgetTheme;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        <Stack gap={6}>
          <Text size={14}>Top repos</Text>
          {empty || items.length === 0 ? (
            <Muted>{NO_REPOSITORIES}</Muted>
          ) : (
            <List items={items} />
          )}
        </Stack>
      </Frame>
    </Theme>
  );
}
