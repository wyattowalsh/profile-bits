export const EXIT_SUCCESS = 0;
export const EXIT_OPERATIONAL = 1;
export const EXIT_USAGE = 2;
export const EXIT_SIGINT = 130;

export class CliExitError extends Error {
  override readonly name = "CliExitError";
  readonly exitCode: number;

  constructor(exitCode: number, message?: string) {
    super(message ?? `exit ${exitCode}`);
    this.exitCode = exitCode;
  }
}

export function isCliExitError(error: unknown): error is CliExitError {
  return error instanceof CliExitError;
}

export function isEpipeError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: unknown }).code === "EPIPE"
  );
}

export function throwCliExit(exitCode: number): never {
  throw new CliExitError(exitCode);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return String(error);
}
