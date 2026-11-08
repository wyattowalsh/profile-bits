import type { ChipsOptions } from "@profile-bits/core";
import {
  ChipsExpandError,
  expandChipsRequest,
  type HttpClient,
} from "@profile-bits/integrations";

export class ChipsWidgetError extends Error {
  override readonly name = "ChipsWidgetError";
  readonly outcome = "fail_widget" as const;
  readonly code?: string;

  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(message, options);
    if (options?.code !== undefined) {
      this.code = options.code;
    }
  }
}

export function toChipsWidgetError(error: unknown): ChipsWidgetError {
  if (error instanceof ChipsWidgetError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "chips widget failed";
  if (error instanceof ChipsExpandError) {
    return new ChipsWidgetError(message, { cause: error, code: error.code });
  }
  return new ChipsWidgetError(message, { cause: error });
}

/** Cached raw badge JSON. Normalize stays a widget reader, not fetch. */
export async function loadChipsPayloads(
  client: HttpClient,
  options: ChipsOptions,
  ctx: { user: string },
): Promise<unknown[]> {
  try {
    const requests = options.types.map((type) =>
      expandChipsRequest({
        preset: options.preset,
        type,
        user: ctx.user,
        repo: options.repo ?? null,
        packageName: options.package ?? null,
        workflow: options.workflow,
      }),
    );
    return await Promise.all(
      requests.map(({ url }) =>
        client.fetchJson({
          url: url.href,
          timeout_ms: options.timeout_ms,
          auth: "none",
        }),
      ),
    );
  } catch (error: unknown) {
    throw toChipsWidgetError(error);
  }
}
