import type { Capabilities, TokenClass } from "@profile-bits/core";
import { inferGithubTokenClass } from "@profile-bits/integrations";

export type PublishProbe = {
  tokenClass: TokenClass;
  capabilities: Capabilities;
};

/**
 * Token-class publish probe. No HTTP, no `createGithubClient`, no `GET /user`.
 * `canGist` is true only for `user_pat`. Crawl flags stay false.
 */
export function publishProbeFromGithubToken(token: string): PublishProbe {
  const tokenClass = inferGithubTokenClass(token);
  return {
    tokenClass,
    capabilities: {
      canPrivate: false,
      canContributions: false,
      canGist: tokenClass === "user_pat",
    },
  };
}
