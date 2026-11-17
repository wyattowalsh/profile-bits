import {
  Empty,
  Frame,
  List,
  Ordinal,
  Row,
  Stack,
  Text,
  Theme,
} from "@profile-bits/bits";
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
            <Empty>{NO_REPOSITORIES}</Empty>
          ) : (
            <Stack gap={6}>
              {items.map((item, index) => (
                <Row
                  gap={8}
                  key={`${item.title}:${item.meta}:${String(index)}`}
                >
                  <Ordinal rank={index + 1} />
                  <List items={[item]} />
                </Row>
              ))}
            </Stack>
          )}
        </Stack>
      </Frame>
    </Theme>
  );
}
