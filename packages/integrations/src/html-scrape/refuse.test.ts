import { describe, expect, it } from "vitest";
import { loadFixture } from "./loadFixture.js";
import { parseHtml } from "./parse.js";
import { refuseReason } from "./refuse.js";

describe("refuseReason", () => {
  it("refuses the login-wall fixture", () => {
    const parsed = parseHtml({
      html: loadFixture("login-wall.html"),
      url: "https://example.com/login",
    });
    expect(
      refuseReason({
        status: 200,
        title: parsed.dump.title,
        flags: parsed.flags,
      }),
    ).toBe("login wall");
  });

  it("refuses the challenge fixture as ToS-hostile", () => {
    const parsed = parseHtml({
      html: loadFixture("challenge.html"),
      url: "https://example.com/page",
    });
    expect(
      refuseReason({
        status: 200,
        title: parsed.dump.title,
        flags: parsed.flags,
      }),
    ).toBe("tos-hostile target");
  });

  it("refuses HTTP 401 as a login wall", () => {
    const parsed = parseHtml({
      html: "<html><title>Unauthorized</title></html>",
      url: "https://example.com/page",
      status: 401,
    });
    expect(
      refuseReason({
        status: 401,
        title: parsed.dump.title,
        flags: parsed.flags,
      }),
    ).toBe("login wall");
  });

  it("allows the public fixture", () => {
    const parsed = parseHtml({
      html: loadFixture("public.html"),
      url: "https://example.com/public",
    });
    expect(
      refuseReason({
        status: 200,
        title: parsed.dump.title,
        flags: parsed.flags,
      }),
    ).toBeNull();
  });
});
