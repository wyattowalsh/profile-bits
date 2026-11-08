/**
 * Complete public LeetCode GraphQL dump. Extra keys stay on the object.
 * Missing fields are omitted. Widgets select; this parser does not slice.
 */

export type LeetcodeDump = Record<string, unknown>;

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function parseLeetcodeDump(data: unknown): LeetcodeDump | null {
  const record = asDumpRecord(data);
  if (record == null || record.matchedUser == null) {
    return null;
  }
  return record;
}

export function dumpFromHtml(
  username: string,
  scrape: {
    title: string | null;
    description: string | null;
    openGraph: Readonly<Record<string, string>>;
  },
): LeetcodeDump {
  const profile: Record<string, unknown> = {};
  if (scrape.title != null && scrape.title !== "") {
    profile.realName = scrape.title;
  }
  if (scrape.description != null && scrape.description !== "") {
    profile.aboutMe = scrape.description;
  }
  const avatar = scrape.openGraph["og:image"];
  if (avatar != null && avatar !== "") {
    profile.userAvatar = avatar;
  }
  const matchedUser: Record<string, unknown> = { username };
  if (Object.keys(profile).length > 0) {
    matchedUser.profile = profile;
  }
  return { matchedUser };
}
