import { describe, expect, it, vi } from "vitest";
import { GithubRequestCache, graphqlCacheKey, restCacheKey } from "./cache.js";

const REPOS_URL = "https://api.github.com/users/octocat/repos";
const REPOS_PARAMS = {
  type: "owner",
  per_page: "100",
  page: "1",
} as const;
const NODES_QUERY = "query Nodes($ids: [ID!]!) { nodes(ids: $ids) { id } }";
const CONTRIBUTIONS_QUERY =
  "query Contributions { viewer { contributionsCollection { totalCommitContributions } } }";

describe("GithubRequestCache", () => {
  it("coalesces two REST calls that share (method, url, params)", async () => {
    const cache = new GithubRequestCache();
    const load = vi.fn(async () => [{ id: 1 }]);
    const parts = {
      method: "GET",
      url: REPOS_URL,
      params: { ...REPOS_PARAMS },
    };

    const [first, second] = await Promise.all([
      cache.rest(parts, load),
      cache.rest({ ...parts }, load),
    ]);
    const third = await cache.rest({ ...parts }, load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(restCacheKey(parts)).toBe(
      restCacheKey({
        method: "GET",
        url: REPOS_URL,
        params: { page: "1", per_page: "100", type: "owner" },
      }),
    );
  });

  it("misses GraphQL when variables differ (not POST /graphql)", async () => {
    const cache = new GithubRequestCache();
    const loadA = vi.fn(async () => ({ batch: "a" }));
    const loadB = vi.fn(async () => ({ batch: "b" }));

    const a = await cache.graphql(
      { query: NODES_QUERY, variables: { ids: ["id-1"] } },
      loadA,
    );
    const b = await cache.graphql(
      { query: NODES_QUERY, variables: { ids: ["id-2"] } },
      loadB,
    );

    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ batch: "a" });
    expect(b).toEqual({ batch: "b" });
    expect(
      graphqlCacheKey({ query: NODES_QUERY, variables: { ids: ["id-1"] } }),
    ).not.toBe("POST /graphql");
    expect(
      graphqlCacheKey({ query: NODES_QUERY, variables: { ids: ["id-1"] } }),
    ).not.toBe(
      graphqlCacheKey({ query: NODES_QUERY, variables: { ids: ["id-2"] } }),
    );
  });

  it("misses GraphQL when queries differ (not POST /graphql)", async () => {
    const cache = new GithubRequestCache();
    const loadNodes = vi.fn(async () => ({ kind: "nodes" }));
    const loadContributions = vi.fn(async () => ({ kind: "contributions" }));
    const variables = { login: "octocat" };

    const nodes = await cache.graphql(
      { query: NODES_QUERY, variables },
      loadNodes,
    );
    const contributions = await cache.graphql(
      { query: CONTRIBUTIONS_QUERY, variables },
      loadContributions,
    );

    expect(loadNodes).toHaveBeenCalledTimes(1);
    expect(loadContributions).toHaveBeenCalledTimes(1);
    expect(nodes).toEqual({ kind: "nodes" });
    expect(contributions).toEqual({ kind: "contributions" });
    expect(graphqlCacheKey({ query: NODES_QUERY, variables })).not.toBe(
      "POST /graphql",
    );
    expect(graphqlCacheKey({ query: NODES_QUERY, variables })).not.toBe(
      graphqlCacheKey({ query: CONTRIBUTIONS_QUERY, variables }),
    );
  });
});
