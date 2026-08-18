import { describe, expect, it } from "vitest";
import { baseOptions } from "./layout.shared";

describe("baseOptions", () => {
  it("exposes /playground and /generate nav hrefs", () => {
    const options = baseOptions();
    const urls = (options.links ?? []).map((link) =>
      "url" in link ? link.url : undefined,
    );

    expect(options.nav?.title).toBe("profile-bits");
    expect(urls).toContain("/playground");
    expect(urls).toContain("/generate");
  });
});
