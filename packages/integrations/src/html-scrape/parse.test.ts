import { describe, expect, it } from "vitest";
import { loadFixture } from "./loadFixture.js";
import { parseHtml } from "./parse.js";

const PAGE_URL = "https://example.com/public";

describe("parseHtml", () => {
  it("maps the public fixture into a typed dump", () => {
    const { dump, flags } = parseHtml({
      html: loadFixture("public.html"),
      url: PAGE_URL,
      status: 200,
      contentType: "text/html; charset=utf-8",
    });

    expect(dump.url).toBe(PAGE_URL);
    expect(dump.status).toBe(200);
    expect(dump.title).toBe("Profile Bits Public Fixture");
    expect(dump.description).toBe("A public HTML page for scrape tests.");
    expect(dump.canonical).toBe("https://example.com/public");
    expect(dump.lang).toBe("en");
    expect(dump.meta.description).toBe("A public HTML page for scrape tests.");
    expect(dump.openGraph).toEqual({
      title: "OG Public Fixture",
      description: "Open Graph description.",
      url: "https://example.com/public",
    });
    expect(dump.twitter).toEqual({ card: "summary" });
    expect(dump.jsonLd).toEqual([
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Profile Bits Public Fixture",
      },
    ]);
    expect(dump.headings).toEqual([{ level: 1, text: "Public heading" }]);
    expect(Object.isFrozen(dump)).toBe(true);
    expect(Object.isFrozen(dump.headings)).toBe(true);
    expect(flags.passwordInput).toBe(false);
    expect(flags.loginForm).toBe(false);
    expect(flags.challenge).toBe(false);
  });

  it("extracts a heading from malformed HTML", () => {
    const { dump } = parseHtml({
      html: loadFixture("malformed.html"),
      url: PAGE_URL,
    });
    expect(dump.title).toBe("Broken");
    expect(dump.description).toBe("from malformed");
    expect(dump.headings).toEqual([{ level: 2, text: "Still extract me" }]);
  });

  it("recovers headings from unclosed tags", () => {
    const { dump } = parseHtml({
      html: `<title>Broken</title><p>Unclosed <div><h2>Still extract me</h2><meta name="description" content="from malformed">`,
      url: PAGE_URL,
    });
    expect(dump.title).toBe("Broken");
    expect(dump.description).toBe("from malformed");
    expect(dump.headings).toEqual([{ level: 2, text: "Still extract me" }]);
  });

  it("flags a login wall fixture", () => {
    const { dump, flags } = parseHtml({
      html: loadFixture("login-wall.html"),
      url: "https://example.com/login",
    });
    expect(dump.title).toBe("Sign in");
    expect(flags.passwordInput).toBe(true);
    expect(flags.loginForm).toBe(true);
  });

  it("flags a Cloudflare-style challenge fixture", () => {
    const { dump, flags } = parseHtml({
      html: loadFixture("challenge.html"),
      url: PAGE_URL,
    });
    expect(dump.title).toBe("Just a moment...");
    expect(flags.challenge).toBe(true);
  });

  it("decodes entities in title and attributes", () => {
    const { dump } = parseHtml({
      html: `<html lang="en"><title>Tom &amp; Jerry&#39;s</title><meta name="description" content="A &lt;tag&gt;"></html>`,
      url: PAGE_URL,
    });
    expect(dump.title).toBe("Tom & Jerry's");
    expect(dump.description).toBe("A <tag>");
  });

  it("does not treat script inner HTML as tags", () => {
    const { dump, flags } = parseHtml({
      html: `<html><head><title>Safe</title><script>document.write('<input type="password">')</script></head><body><h1>Ok</h1></body></html>`,
      url: PAGE_URL,
    });
    expect(dump.title).toBe("Safe");
    expect(dump.headings).toEqual([{ level: 1, text: "Ok" }]);
    expect(flags.passwordInput).toBe(false);
  });

  it("omits invalid JSON-LD without failing", () => {
    const { dump } = parseHtml({
      html: `<html><head><title>X</title><script type="application/ld+json">{not json</script></head></html>`,
      url: PAGE_URL,
    });
    expect(dump.title).toBe("X");
    expect(dump.jsonLd).toEqual([]);
  });
});
