import { createElement, useState } from "react";
import { describe, expect, it } from "vitest";
import { fromJsx, fromJsxResult } from "./from-jsx.ts";

describe("fromJsx", () => {
  it("converts JSX elements to a Takumi node", async () => {
    const node = await fromJsx(createElement("p", null, "hello"));

    expect(node).toMatchObject({
      type: "text",
      text: "hello",
      tagName: "p",
    });
  });

  it("renders useState initial value with server semantics", async () => {
    function Label() {
      const [text] = useState("ready");
      return createElement("span", null, text);
    }

    const node = await fromJsx(createElement(Label));

    expect(node).toMatchObject({
      type: "text",
      text: "ready",
      tagName: "span",
    });
  });

  it("does not require a DOM document", async () => {
    expect(Reflect.get(globalThis, "document")).toBeUndefined();

    const node = await fromJsx(createElement("span", null, "ok"));

    expect(node).toMatchObject({
      type: "text",
      text: "ok",
      tagName: "span",
    });
  });
});

describe("fromJsxResult", () => {
  it("returns a Takumi node plus a stylesheets array", async () => {
    const result = await fromJsxResult(createElement("p", null, "hello"));

    expect(result.node).toMatchObject({
      type: "text",
      text: "hello",
      tagName: "p",
    });
    expect(result.stylesheets).toEqual([]);
  });
});
