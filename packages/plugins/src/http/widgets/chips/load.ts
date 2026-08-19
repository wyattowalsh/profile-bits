import type { ChipsOptions } from "@profile-bits/core";
import {
  expandChipsRequest,
  type HttpClient,
  type NormalizedBadge,
  normalizeBadgeJson,
} from "@profile-bits/integrations";

export class ChipsWidgetError extends Error {
  override readonly name = "ChipsWidgetError";
  readonly outcome = "fail_widget" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export function toChipsWidgetError(error: unknown): ChipsWidgetError {
  if (error instanceof ChipsWidgetError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "chips widget failed";
  return new ChipsWidgetError(message, { cause: error });
}

export async function loadChipsPayloads(
  client: HttpClient,
  options: ChipsOptions,
  ctx: { user: string },
): Promise<NormalizedBadge[]> {
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
    const payloads = await Promise.all(
      requests.map(({ url }) =>
        client.fetchJson({
          url: url.href,
          timeout_ms: options.timeout_ms,
          auth: "none",
        }),
      ),
    );
    return payloads.map((payload) => normalizeBadgeJson(payload));
  } catch (error: unknown) {
    throw toChipsWidgetError(error);
  }
}
