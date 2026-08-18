import { describe, expect, it } from "vitest";
import { classifyWakatimeHttp } from "./http.js";

describe("classifyWakatimeHttp", () => {
  it("maps 401 to fail_run", () => {
    expect(classifyWakatimeHttp({ status: 401 })).toBe("fail_run");
  });

  it.each([403, 429, 302, 202, 500, 502, 503])(
    "maps %s to fail_after_backoff",
    (status) => {
      expect(classifyWakatimeHttp({ status })).toBe("fail_after_backoff");
    },
  );

  it.each([404, 400])("maps %s to fail_widget", (status) => {
    expect(classifyWakatimeHttp({ status })).toBe("fail_widget");
  });

  it("maps 200 + is_up_to_date false to fail_after_backoff", () => {
    expect(
      classifyWakatimeHttp({
        status: 200,
        body: { data: { is_up_to_date: false } },
      }),
    ).toBe("fail_after_backoff");
  });

  it("maps 200 with up-to-date data to render", () => {
    expect(
      classifyWakatimeHttp({
        status: 200,
        body: { data: { is_up_to_date: true, total_seconds: 1 } },
      }),
    ).toBe("render");
  });
});
