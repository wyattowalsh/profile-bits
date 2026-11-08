import { loadFixture } from "../../../../integrations/src/github/loadFixture.js";
import {
  type GithubLanguageAccumulator,
  languageBytesFromTotals,
  mergeGithubLanguageBytes,
  parseGithubContributionCalendar,
  parseGithubOwnerRepository,
  parseGithubRepository,
  parseGithubUser,
} from "../../../../integrations/src/github/payload.js";

/** W2-G-04 disk dump. Extra keys stay so widget parse can ignore them. Never HTTP. */
export function githubDumpFromFixtures(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const user = parseGithubUser(loadFixture("user.json"));
  if (user == null) {
    throw new Error("expected user.json dump");
  }
  const repositories = ownerReposFromFixture();
  const totals = new Map<string, GithubLanguageAccumulator>();
  mergeGithubLanguageBytes(totals, loadFixture("languages-nodes.json"));
  const calendar = parseGithubContributionCalendar(
    loadFixture("contributions.json"),
  );
  const repository = parseGithubRepository(loadFixture("repo.json"));
  return {
    user,
    repositories,
    repositoryIds: repositories.map((repo) => repo.nodeId),
    languages: languageBytesFromTotals(totals),
    ...(calendar === undefined
      ? {}
      : { contributions: calendar.totalContributions, calendar }),
    ...(repository == null ? {} : { repository }),
    pinnedItems: [
      {
        kind: "repository",
        name: "Hello-World",
        nameWithOwner: "octocat/Hello-World",
        description: "pinned extra",
        url: "https://github.com/octocat/Hello-World",
        stargazerCount: 2000,
      },
    ],
    publicEvents: [
      {
        id: "1",
        type: "PushEvent",
        actorLogin: "octocat",
        repoName: "octocat/Hello-World",
        public: true,
        createdAt: "2026-01-15T00:00:00Z",
      },
    ],
    unexpected: { foo: 1, nested: [true] },
    ...extra,
  };
}

function ownerReposFromFixture() {
  const raw = loadFixture("repos.json");
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = [];
  for (const entry of raw) {
    const parsed = parseGithubOwnerRepository(entry);
    if (parsed == null || parsed.fork || parsed.archived) {
      continue;
    }
    out.push(parsed);
  }
  return out;
}
