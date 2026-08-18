import {
  ACTION_CONFIG_PATH_DEFAULT,
  ActionInputsSchema,
  CODING_API_DOMAIN_DEFAULT,
  DEFAULT_YAML,
  parseConfig,
} from "@profile-bits/core";
import type { GithubClient, WakatimeClient } from "@profile-bits/integrations";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ActionClientFactories, createActionClients } from "./clients.ts";
import type { LoadedActionConfig } from "./load-config.ts";

const GITHUB_TOKEN = "ghs_test_token";
const WAKATIME_TOKEN = "waka_secret_token_do_not_log";
const WAKATIME_TOKEN_PADDED = `  ${WAKATIME_TOKEN}  `;

const GITHUB_AND_WAKATIME_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      stats: {}
      languages: {}
  wakatime: {}
`;

const WAKATIME_ONLY_YAML = `version: 1
format: svg
plugins:
  wakatime: {}
`;

const WAKATIME_CUSTOM_DOMAIN_YAML = `version: 1
format: svg
plugins:
  wakatime:
    widgets:
      coding:
        api_domain: wakapi.dev
`;

const consoleSpies = [
  vi.spyOn(console, "log").mockImplementation(() => {}),
  vi.spyOn(console, "info").mockImplementation(() => {}),
  vi.spyOn(console, "warn").mockImplementation(() => {}),
  vi.spyOn(console, "error").mockImplementation(() => {}),
  vi.spyOn(console, "debug").mockImplementation(() => {}),
];

afterEach(() => {
  vi.clearAllMocks();
});

function loadedConfig(
  yaml: string,
  inputOverrides: Record<string, unknown> = {},
): LoadedActionConfig {
  const parsed = ActionInputsSchema.parse({
    github_token: GITHUB_TOKEN,
    output_action: "none",
    ...inputOverrides,
  });
  const githubToken = parsed.github_token;
  if (githubToken === undefined) {
    throw new Error("github_token is required on LoadedActionInputs");
  }
  return {
    inputs: {
      ...parsed,
      github_token: githubToken,
    },
    config: parseConfig({ yaml }),
    configPath: ACTION_CONFIG_PATH_DEFAULT,
    configFileExists: true,
  };
}

function fakeGithubClient(): GithubClient {
  return {
    tokenClass: "actions_installation",
    capabilities: {
      canPrivate: false,
      canContributions: false,
      canGist: false,
    },
    loadPayload: async () => {
      throw new Error("github loadPayload is not used in clients tests");
    },
    fetchPayload: async () => {
      throw new Error("github fetchPayload is not used in clients tests");
    },
  };
}

function fakeWakatimeClient(): WakatimeClient {
  return {
    fetchStats: async () => {
      throw new Error("wakatime fetchStats is not used in clients tests");
    },
  };
}

function invoke(yaml: string, inputOverrides: Record<string, unknown> = {}) {
  const github = fakeGithubClient();
  const wakatime = fakeWakatimeClient();
  const createGithubClient = vi.fn<
    NonNullable<ActionClientFactories["createGithubClient"]>
  >(() => github);
  const createWakatimeClient = vi.fn<
    NonNullable<ActionClientFactories["createWakatimeClient"]>
  >(() => wakatime);
  const loaded = loadedConfig(yaml, inputOverrides);
  let clients: ReturnType<typeof createActionClients>;
  try {
    clients = createActionClients(loaded, {
      createGithubClient,
      createWakatimeClient,
    });
  } catch (error) {
    expect(String(error)).not.toContain(WAKATIME_TOKEN);
    expect(error instanceof Error ? error.message : "").not.toContain(
      WAKATIME_TOKEN,
    );
    throw error;
  }
  return {
    clients,
    github,
    wakatime,
    createGithubClient,
    createWakatimeClient,
  };
}

function assertTokenNotLogged(token: string): void {
  for (const spy of consoleSpies) {
    for (const args of spy.mock.calls) {
      expect(args.map(String).join(" ")).not.toContain(token);
    }
  }
}

describe("createActionClients", () => {
  it("constructs github once for default yaml and does not construct wakatime when the pack is off", () => {
    const { clients, github, createGithubClient, createWakatimeClient } =
      invoke(DEFAULT_YAML);

    expect(clients.github).toBe(github);
    expect(clients.wakatime).toBeUndefined();
    expect(createGithubClient).toHaveBeenCalledOnce();
    expect(createGithubClient).toHaveBeenCalledWith({
      token: GITHUB_TOKEN,
      configuredUser: "",
    });
    expect(createWakatimeClient).not.toHaveBeenCalled();
    assertTokenNotLogged(WAKATIME_TOKEN);
  });

  it("does not construct wakatime when the pack is off even if wakatime_token is set", () => {
    const { clients, createGithubClient, createWakatimeClient } = invoke(
      DEFAULT_YAML,
      { wakatime_token: WAKATIME_TOKEN },
    );

    expect(clients.github).toBeDefined();
    expect(clients.wakatime).toBeUndefined();
    expect(createGithubClient).toHaveBeenCalledOnce();
    expect(createWakatimeClient).not.toHaveBeenCalled();
    assertTokenNotLogged(WAKATIME_TOKEN);
  });

  it("constructs wakatime once with a trimmed token and default apiDomain when the pack is on", () => {
    const {
      clients,
      github,
      wakatime,
      createGithubClient,
      createWakatimeClient,
    } = invoke(GITHUB_AND_WAKATIME_YAML, {
      wakatime_token: WAKATIME_TOKEN_PADDED,
    });

    expect(clients.github).toBe(github);
    expect(clients.wakatime).toBe(wakatime);
    expect(createGithubClient).toHaveBeenCalledOnce();
    expect(createGithubClient).toHaveBeenCalledWith({
      token: GITHUB_TOKEN,
      configuredUser: "",
    });
    expect(createWakatimeClient).toHaveBeenCalledOnce();
    expect(createWakatimeClient).toHaveBeenCalledWith({
      token: WAKATIME_TOKEN,
      apiDomain: CODING_API_DOMAIN_DEFAULT,
    });
    expect(createWakatimeClient.mock.calls[0]?.[0]).not.toHaveProperty("fetch");
    assertTokenNotLogged(WAKATIME_TOKEN);
  });

  it.each([undefined, "", "   ", "\t\n"] as const)(
    "does not construct wakatime when the pack is on and the token is missing (%j)",
    (wakatimeToken) => {
      const inputOverrides =
        wakatimeToken === undefined ? {} : { wakatime_token: wakatimeToken };
      const { clients, createGithubClient, createWakatimeClient } = invoke(
        GITHUB_AND_WAKATIME_YAML,
        inputOverrides,
      );

      expect(clients.github).toBeDefined();
      expect(clients.wakatime).toBeUndefined();
      expect(createGithubClient).toHaveBeenCalledOnce();
      expect(createWakatimeClient).not.toHaveBeenCalled();
    },
  );

  it("does not construct github for wakatime-only yaml and constructs wakatime when a token is present", () => {
    const { clients, wakatime, createGithubClient, createWakatimeClient } =
      invoke(WAKATIME_ONLY_YAML, { wakatime_token: WAKATIME_TOKEN });

    expect(clients.github).toBeUndefined();
    expect(clients.wakatime).toBe(wakatime);
    expect(createGithubClient).not.toHaveBeenCalled();
    expect(createWakatimeClient).toHaveBeenCalledOnce();
    expect(createWakatimeClient).toHaveBeenCalledWith({
      token: WAKATIME_TOKEN,
      apiDomain: CODING_API_DOMAIN_DEFAULT,
    });
    expect(createWakatimeClient.mock.calls[0]?.[0]).not.toHaveProperty("fetch");
    assertTokenNotLogged(WAKATIME_TOKEN);
  });

  it("passes yaml coding api_domain and never logs the token", () => {
    const { createWakatimeClient, createGithubClient } = invoke(
      WAKATIME_CUSTOM_DOMAIN_YAML,
      { wakatime_token: WAKATIME_TOKEN },
    );

    expect(createGithubClient).not.toHaveBeenCalled();
    expect(createWakatimeClient).toHaveBeenCalledOnce();
    expect(createWakatimeClient).toHaveBeenCalledWith({
      token: WAKATIME_TOKEN,
      apiDomain: "wakapi.dev",
    });
    assertTokenNotLogged(WAKATIME_TOKEN);
  });
});
