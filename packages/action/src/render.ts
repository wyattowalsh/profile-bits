import type { ActionClients } from "./clients.ts";
import { EngineError, type RenderWidget } from "./engine.ts";
import { createGithubRenderWidget } from "./render-github.ts";
import { createWakatimeRenderWidget } from "./render-wakatime.ts";

const GITHUB_RENDER_NOT_INJECTED =
  "renderWidget is not injected (engine fetch/render is a port; no GitHub HTTP)";

export class UnhandledActionWidgetError extends Error {
  override readonly name = "UnhandledActionWidgetError";

  constructor(id: string) {
    super(`action render dispatcher does not handle widget ${id}`);
  }
}

/** Switch coding vs github. Unknown id throws UnhandledActionWidgetError. */
export function createRenderWidget(adapters: {
  coding?: RenderWidget;
  github?: RenderWidget;
}): RenderWidget {
  return (request) => {
    switch (request.id) {
      case "coding": {
        const coding = adapters.coding;
        if (coding === undefined) {
          throw new EngineError(
            "coding render adapter is not injected",
            "fail_run",
          );
        }
        return coding(request);
      }
      case "demo":
      case "stats":
      case "languages": {
        const github = adapters.github;
        if (github === undefined) {
          throw new EngineError(GITHUB_RENDER_NOT_INJECTED, "fail_run");
        }
        return github(request);
      }
      default:
        throw new UnhandledActionWidgetError(request.id);
    }
  };
}

/** Convenience: build adapters from ActionClients (one client per run). */
export function createRenderWidgetFromClients(
  clients: ActionClients,
): RenderWidget {
  return createRenderWidget({
    coding:
      clients.wakatime === undefined
        ? undefined
        : createWakatimeRenderWidget({ client: clients.wakatime }),
    github:
      clients.github === undefined
        ? undefined
        : createGithubRenderWidget({ client: clients.github }),
  });
}
