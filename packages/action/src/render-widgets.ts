import { EngineError, type RenderWidget } from "./engine.ts";

export function composeRenderWidgets(adapters: {
  json: RenderWidget;
  feed?: RenderWidget;
  github?: RenderWidget;
}): RenderWidget {
  return (request) => {
    if (request.id === "json" || request.id === "chips") {
      return adapters.json(request);
    }
    if (request.id === "feed" && adapters.feed !== undefined) {
      return adapters.feed(request);
    }
    const github = adapters.github;
    if (github === undefined) {
      throw new EngineError(
        "renderWidget is not injected (engine fetch/render is a port; no GitHub HTTP)",
        "fail_run",
      );
    }
    return github(request);
  };
}
