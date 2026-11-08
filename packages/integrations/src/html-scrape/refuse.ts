import type { HtmlParseFlags } from "./parse.js";

export type HtmlRefuseReason = "login wall" | "tos-hostile target";

export function refuseReason(input: {
  status: number;
  title: string | null;
  flags: HtmlParseFlags;
}): HtmlRefuseReason | null {
  if (input.flags.challenge) {
    return "tos-hostile target";
  }
  if (input.status === 401 || input.status === 403) {
    return "login wall";
  }
  if (input.flags.passwordInput || input.flags.loginForm) {
    return "login wall";
  }
  if (
    input.title != null &&
    /sign\s*in|log\s*in|login|authenticate/iu.test(input.title)
  ) {
    return "login wall";
  }
  return null;
}
