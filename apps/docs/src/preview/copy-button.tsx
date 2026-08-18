"use client";

import {
  type ComponentProps,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export const COPY_BUTTON_LABEL = "Copy";
export const COPY_BUTTON_COPIED_LABEL = "Copied";
export const COPY_BUTTON_RESET_MS = 2000;

const COPY_BUTTON_CSS = `
[data-slot="copy-button"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
  cursor: pointer;
  background: var(--color-fd-primary);
  color: var(--color-fd-primary-foreground);
  transition: background-color 150ms ease, color 150ms ease;
}
[data-slot="copy-button"][data-copied="true"] {
  background: var(--color-fd-muted);
  color: var(--color-fd-foreground);
}
[data-slot="copy-button"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  [data-slot="copy-button"] {
    transition: none;
  }
}
`;

/** Clipboard helper used by CopyButton. Exported so tests can mock navigator.clipboard. */
export async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export type CopyButtonProps = Omit<
  ComponentProps<"button">,
  "type" | "value" | "children"
> & {
  value: string;
  label?: string;
  copiedLabel?: string;
};

/** Playground primary CTA primitive. Copies `value` to the clipboard. */
export function CopyButton({
  value,
  label = COPY_BUTTON_LABEL,
  copiedLabel = COPY_BUTTON_COPIED_LABEL,
  className,
  onClick,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }
      try {
        await copyText(value);
      } catch {
        setCopied(false);
        return;
      }
      setCopied(true);
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
      }
      resetTimer.current = setTimeout(() => {
        setCopied(false);
        resetTimer.current = null;
      }, COPY_BUTTON_RESET_MS);
    },
    [onClick, value],
  );

  const name = copied ? copiedLabel : label;

  return (
    <>
      <style href="profile-bits-copy-button" precedence="default">
        {COPY_BUTTON_CSS}
      </style>
      <button
        {...props}
        type="button"
        data-slot="copy-button"
        data-copied={copied ? "true" : "false"}
        aria-label={name}
        aria-live="polite"
        className={cn(className)}
        onClick={(event) => {
          void handleClick(event);
        }}
      >
        {name}
      </button>
    </>
  );
}
