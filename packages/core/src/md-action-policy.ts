/**
 * Action markdown policy. Profile yaml has no `md.` field (`ConfigSchema`
 * is `z.strictObject`); unknown keys already fail parse. Do not splice
 * `parse-config.ts`. Mermaid/shiki/katex/MDX are later renderer/md extras
 * and must not enter the Action ncc graph.
 */

export const ACTION_MD_PIPELINE = [
  "remark-parse",
  "remark-gfm",
  "remark-rehype",
  "rehype-sanitize",
  "rehype-stringify",
] as const;

export type ActionMdPipelineId = (typeof ACTION_MD_PIPELINE)[number];

export const ACTION_FORBIDDEN_MD_NPM = [
  "shiki",
  "@shikijs/rehype",
  "mermaid",
  "isomorphic-mermaid",
  "rehype-mermaid",
  "rehype-mermaidjs",
  "remark-mermaidjs",
  "katex",
  "rehype-katex",
  "remark-math",
  "@mdx-js/mdx",
  "rehype-pretty-code",
] as const;

export type ActionForbiddenMdNpm = (typeof ACTION_FORBIDDEN_MD_NPM)[number];

const FORBIDDEN = new Set<string>(ACTION_FORBIDDEN_MD_NPM);

export class ActionMdPolicyError extends Error {
  override readonly name = "ActionMdPolicyError";

  constructor(message: string) {
    super(message);
  }
}

export function isActionForbiddenMdPackage(name: string): boolean {
  return FORBIDDEN.has(name);
}

export function assertActionMdPackage(name: string): void {
  if (isActionForbiddenMdPackage(name)) {
    throw new ActionMdPolicyError(
      `Action markdown is GFM-only; ${name} is later renderer/md, not ncc`,
    );
  }
}

export function isActionMdPipelineId(name: string): name is ActionMdPipelineId {
  return (ACTION_MD_PIPELINE as readonly string[]).includes(name);
}
