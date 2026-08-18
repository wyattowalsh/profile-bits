const AUTHORIZATION_VALUE = /Authorization:\s+\S+(?:\s+\S+)?/gi;
const SCHEME_VALUE = /\b(?:Bearer|token|Basic)\s+\S+/gi;

export function redactSecrets(
  message: string,
  secrets: readonly (string | undefined | null)[] = [],
): string {
  let redacted = message;
  for (const secret of secrets) {
    if (secret == null || secret === "") {
      continue;
    }
    const trimmed = secret.trim();
    if (trimmed === "") {
      continue;
    }
    redacted = redacted.split(trimmed).join("[redacted]");
  }
  redacted = redacted.replaceAll(
    AUTHORIZATION_VALUE,
    "Authorization: [redacted]",
  );
  redacted = redacted.replaceAll(SCHEME_VALUE, "[redacted]");
  return redacted;
}
