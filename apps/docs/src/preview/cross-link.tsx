import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  GENERATE_PATH_PREFIX,
  PLAYGROUND_PATH_PREFIX,
  stripTokens,
  toCrossLink,
} from "./permalink";

export { stripTokens, toCrossLink };

/**
 * Swap `/playground` ↔ `/generate`, keep the query, strip token keys.
 * Delegates to permalink `toCrossLink` (do not fork that heuristic).
 */
export function crossLinkHref(href: string): string {
  return toCrossLink(href);
}

function pathOf(href: string): string {
  const trimmed = href.trim();
  const queryAt = trimmed.indexOf("?");
  return queryAt === -1 ? trimmed : trimmed.slice(0, queryAt);
}

/** Accessible default label for the swapped destination. */
export function crossLinkLabel(href: string): string {
  const path = pathOf(href);
  if (
    path === GENERATE_PATH_PREFIX ||
    path.startsWith(`${GENERATE_PATH_PREFIX}/`)
  ) {
    return "Open in Generate";
  }
  if (
    path === PLAYGROUND_PATH_PREFIX ||
    path.startsWith(`${PLAYGROUND_PATH_PREFIX}/`)
  ) {
    return "Open in Playground";
  }
  return "Open linked preview";
}

export type CrossLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children?: ReactNode;
};

/**
 * Accessible Next.js link between playground (codegen) and generate (catalog).
 * v0 pack is github only — this component does not invent plugin ids.
 */
export function CrossLink({ href, children, ...props }: CrossLinkProps) {
  const target = crossLinkHref(href);
  return (
    <Link data-slot="cross-link" {...props} href={target}>
      {children ?? crossLinkLabel(target)}
    </Link>
  );
}
