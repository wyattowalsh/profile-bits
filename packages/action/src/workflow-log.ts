export function escapeWorkflowCommand(message: string): string {
  return message
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

export function logWorkflowWarning(input: {
  message: string;
  group: string;
}): void {
  const { message, group } = input;
  process.stderr.write(`${message}\n`);
  if (process.env.GITHUB_ACTIONS !== "true") {
    return;
  }
  process.stdout.write(`::warning::${escapeWorkflowCommand(message)}\n`);
  process.stdout.write(`::group::${escapeWorkflowCommand(group)}\n`);
  process.stdout.write(`${message}\n`);
  process.stdout.write("::endgroup::\n");
}
