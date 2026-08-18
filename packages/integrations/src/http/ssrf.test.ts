import { describe, expect, it, vi } from "vitest";
import {
  assertSafeHttpUrl,
  assertSafeResolvedAddresses,
  type HttpLookup,
  HttpSsrfError,
  resolveValidatedAddresses,
} from "./ssrf.js";

const PUBLIC_V4 = "93.184.216.34";

function publicLookup(): HttpLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

describe("assertSafeHttpUrl", () => {
  it("rejects http://", () => {
    expect(() => assertSafeHttpUrl("http://example.com/api.json")).toThrow(
      HttpSsrfError,
    );
  });

  it("rejects localhost names", () => {
    expect(() => assertSafeHttpUrl("https://localhost/api.json")).toThrow(
      HttpSsrfError,
    );
  });

  it("rejects 127.0.0.1", () => {
    expect(() => assertSafeHttpUrl("https://127.0.0.1/api.json")).toThrow(
      HttpSsrfError,
    );
  });

  it("rejects 10.0.0.1", () => {
    expect(() => assertSafeHttpUrl("https://10.0.0.1/api.json")).toThrow(
      HttpSsrfError,
    );
  });

  it("rejects 172.16.0.1", () => {
    expect(() => assertSafeHttpUrl("https://172.16.0.1/api.json")).toThrow(
      HttpSsrfError,
    );
  });

  it("rejects 192.168.1.1 (RFC1918 /16 not /8)", () => {
    expect(() => assertSafeHttpUrl("https://192.168.1.1/api.json")).toThrow(
      HttpSsrfError,
    );
  });

  it("rejects 169.254.169.254", () => {
    expect(() =>
      assertSafeHttpUrl("https://169.254.169.254/latest/meta-data/"),
    ).toThrow(HttpSsrfError);
  });

  it("rejects ::1", () => {
    expect(() => assertSafeHttpUrl("https://[::1]/api.json")).toThrow(
      HttpSsrfError,
    );
  });

  it("rejects userinfo host", () => {
    expect(() =>
      assertSafeHttpUrl("https://user:pass@example.com/api.json"),
    ).toThrow(HttpSsrfError);
  });

  it("rejects decimal IP", () => {
    expect(() => assertSafeHttpUrl("https://2130706433/api.json")).toThrow(
      HttpSsrfError,
    );
  });

  it("rejects metadata.google.internal", () => {
    expect(() =>
      assertSafeHttpUrl("https://metadata.google.internal/computeMetadata/v1/"),
    ).toThrow(HttpSsrfError);
  });

  it("rejects metadata.internal", () => {
    expect(() =>
      assertSafeHttpUrl("https://metadata.internal/latest/meta-data/"),
    ).toThrow(HttpSsrfError);
  });

  it("accepts public example.com", () => {
    expect(assertSafeHttpUrl("https://example.com/api.json").hostname).toBe(
      "example.com",
    );
  });
});

describe("assertSafeResolvedAddresses", () => {
  it("rejects IPv4-mapped private ::ffff:10.0.0.1", () => {
    expect(() =>
      assertSafeResolvedAddresses([{ address: "::ffff:10.0.0.1", family: 6 }]),
    ).toThrow(HttpSsrfError);
  });

  it("rejects IPv4-mapped loopback ::ffff:127.0.0.1", () => {
    expect(() =>
      assertSafeResolvedAddresses([{ address: "::ffff:127.0.0.1", family: 6 }]),
    ).toThrow(HttpSsrfError);
  });

  it("rejects IPv4-mapped hex loopback ::ffff:7f00:1", () => {
    expect(() =>
      assertSafeResolvedAddresses([{ address: "::ffff:7f00:1", family: 6 }]),
    ).toThrow(HttpSsrfError);
  });

  it("rejects CGNAT 100.64.0.1", () => {
    expect(() =>
      assertSafeResolvedAddresses([{ address: "100.64.0.1", family: 4 }]),
    ).toThrow(HttpSsrfError);
  });

  it("fails closed on mixed public A + private AAAA", () => {
    expect(() =>
      assertSafeResolvedAddresses([
        { address: PUBLIC_V4, family: 4 },
        { address: "fd00::1", family: 6 },
      ]),
    ).toThrow(HttpSsrfError);
  });

  it("allows public A", () => {
    expect(
      assertSafeResolvedAddresses([{ address: PUBLIC_V4, family: 4 }]),
    ).toEqual([{ address: PUBLIC_V4, family: 4 }]);
  });
});

describe("resolveValidatedAddresses", () => {
  it("rejects DNS that resolves to a private address before connect", async () => {
    const lookup = vi.fn<HttpLookup>(async () => [
      { address: "192.168.1.1", family: 4 },
    ]);
    await expect(
      resolveValidatedAddresses(
        new URL("https://example.com/api.json"),
        lookup,
      ),
    ).rejects.toBeInstanceOf(HttpSsrfError);
  });

  it("rejects IPv4-mapped loopback URL literal before lookup", async () => {
    const lookup = vi.fn(publicLookup());
    await expect(
      resolveValidatedAddresses(
        new URL("https://[::ffff:127.0.0.1]/api.json"),
        lookup,
      ),
    ).rejects.toBeInstanceOf(HttpSsrfError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects DNS that resolves to IPv4-mapped loopback before connect", async () => {
    for (const address of ["::ffff:127.0.0.1", "::ffff:7f00:1"] as const) {
      const lookup = vi.fn<HttpLookup>(async () => [{ address, family: 6 }]);
      await expect(
        resolveValidatedAddresses(
          new URL("https://example.com/api.json"),
          lookup,
        ),
      ).rejects.toBeInstanceOf(HttpSsrfError);
      expect(lookup).toHaveBeenCalledWith("example.com", { all: true });
    }
  });

  it("rejects CGNAT 100.64.0.1 URL literal before lookup", async () => {
    const lookup = vi.fn(publicLookup());
    await expect(
      resolveValidatedAddresses(new URL("https://100.64.0.1/api.json"), lookup),
    ).rejects.toBeInstanceOf(HttpSsrfError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("passes public example.com + public A", async () => {
    const lookup = vi.fn(publicLookup());
    const addresses = await resolveValidatedAddresses(
      new URL("https://example.com/api.json"),
      lookup,
    );
    expect(addresses).toEqual([{ address: PUBLIC_V4, family: 4 }]);
    expect(lookup).toHaveBeenCalledWith("example.com", { all: true });
  });
});
