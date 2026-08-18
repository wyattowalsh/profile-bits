import { describe, expect, it, vi } from "vitest";
import {
  assertStaticActionToken,
  getSharedStaticClient,
  getStaticFixtures,
  loadPreviewFixtures,
  STATIC_AUTH,
  STATIC_FIXED_NOW,
  STATIC_FIXTURE_USER,
  STATIC_ID,
  STATIC_INTEGRATION,
  STATIC_SCOPES,
  StaticClient,
  staticAuthorizationHeader,
  staticRequiresAuthorization,
} from "../index.js";

describe("static client", () => {
  it("uses auth none and never emits Authorization", () => {
    expect(STATIC_ID).toBe("static");
    expect(STATIC_AUTH).toBe("none");
    expect(STATIC_SCOPES).toEqual([]);
    expect(STATIC_INTEGRATION).toEqual({
      id: "static",
      auth: "none",
      scopes: [],
    });
    expect(staticRequiresAuthorization()).toBe(false);
    expect(staticAuthorizationHeader("ghs_ignored")).toEqual({});
    expect(staticAuthorizationHeader("")).toEqual({});
    expect(() => assertStaticActionToken(undefined)).not.toThrow();
    expect(() => assertStaticActionToken("")).not.toThrow();
    expect(() => assertStaticActionToken("   ")).not.toThrow();
    expect(new StaticClient().authorizationHeader()).toEqual({});
  });

  it("shares one client instance per run", () => {
    const run = {};
    const first = getSharedStaticClient(run);
    const second = getSharedStaticClient(run);
    expect(first).toBe(second);
    expect(getSharedStaticClient({})).not.toBe(first);
  });

  it("serves octocat fixtures without fetch or GitHub HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const client = new StaticClient();
    const preview = await loadPreviewFixtures();

    expect(client.user).toBe(STATIC_FIXTURE_USER);
    expect(client.userRecord().login).toBe("octocat");
    expect(client.demo()).toEqual({
      text: "profile-bits",
      animate: true,
    });
    expect(client.stats().stars).toBe(2250);
    expect(client.languages().map((row) => row.name)).toContain("JavaScript");
    expect(client.repos().some((repo) => repo.fork)).toBe(true);
    expect(preview).toBe(getStaticFixtures());
    expect(preview).toBe(client.fixtures());
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("exposes the fixture clock, not Date.now()", () => {
    const before = Date.now();
    const client = new StaticClient();
    expect(client.generatedAt()).toBe(STATIC_FIXED_NOW);
    expect(client.now().toISOString()).toBe(STATIC_FIXED_NOW);
    expect(client.now().getTime()).toBeLessThan(before);

    const injected = new Date("2011-01-25T18:44:36.000Z");
    const pinned = new StaticClient({
      clock: { now: () => injected },
    });
    expect(pinned.now()).toBe(injected);
  });
});
