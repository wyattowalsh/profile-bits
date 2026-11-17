import { Duration, Muted, Row } from "@profile-bits/bits";
import type { SecondsStat } from "./read-dump.js";

export function SecondsStats({ stats }: { stats?: readonly SecondsStat[] }) {
  if (stats === undefined || stats.length === 0) {
    return null;
  }
  return (
    <Row gap={8}>
      {stats.map((stat) => (
        <Row gap={4} key={stat.label}>
          <Muted size={12}>{stat.label}</Muted>
          <Duration seconds={stat.seconds} />
        </Row>
      ))}
    </Row>
  );
}
