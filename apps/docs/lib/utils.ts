/** Classname join for shadcn chrome. Docs chrome is not the widget runtime. */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter((value): value is string => Boolean(value)).join(" ");
}
