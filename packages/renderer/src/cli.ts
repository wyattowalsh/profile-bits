import type { Node } from "@takumi-rs/helpers";
import { container, text } from "@takumi-rs/helpers";
import { isStillFormat, render } from "./render.js";
import { renderSvg } from "./render-svg.js";

export const CLI_SMOKE_NODE: Node = container({
  style: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
  },
  children: [
    text({
      text: "profile-bits",
      style: {
        color: "#f8fafc",
        fontFamily: "Geist",
        fontSize: 32,
        fontWeight: 700,
      },
    }),
  ],
});

export type RendererCliFormat = "svg" | "png" | "jpeg" | "webp" | "ico";

/**
 * Local still-format helper. Root `package.json` `"render"` stays
 * `@profile-bits/cli` (`profile-bits render` / Action `runMain`).
 */
export async function renderCli(
  format: string,
  node: Node = CLI_SMOKE_NODE,
): Promise<string | Uint8Array> {
  if (format === "svg") {
    return renderSvg(node);
  }
  if (!isStillFormat(format)) {
    throw new TypeError(
      `unsupported renderer cli format: ${format} (expected svg | png | jpeg | webp | ico)`,
    );
  }
  return render(node, format);
}
