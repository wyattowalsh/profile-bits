/**
 * Wrap-and-fail around Takumi convert/render. No tag denylist.
 * Empty-tree lives in assert-tree; foreignObject is SVG-output only.
 */

export class TakumiRenderError extends Error {
  override readonly name = "TakumiRenderError";

  constructor(message: string, options?: { cause?: unknown }) {
    super(
      message,
      options?.cause === undefined ? undefined : { cause: options.cause },
    );
  }
}

export function withTakumi<T>(fn: () => T): T;
export function withTakumi<T>(fn: () => Promise<T>): Promise<T>;
export function withTakumi<T>(fn: () => T | Promise<T>): T | Promise<T> {
  try {
    const result = fn();
    if (isPromise(result)) {
      return result.catch((error: unknown) => {
        throw wrapTakumiError(error);
      });
    }
    return result;
  } catch (error) {
    throw wrapTakumiError(error);
  }
}

export function assertTakumiSvg(svg: string): void {
  if (/<foreignObject\b/i.test(svg)) {
    throw new TakumiRenderError("Takumi SVG contained foreignObject");
  }
}

function wrapTakumiError(error: unknown): TakumiRenderError {
  if (error instanceof TakumiRenderError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "Takumi render failed";
  return new TakumiRenderError(message, { cause: error });
}

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value != null &&
    typeof (value as Promise<T>).then === "function"
  );
}
