import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { docsTree } from "@/lib/docs-tree";
import { baseOptions } from "@/lib/layout.shared";

export default function DocsSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocsLayout {...baseOptions()} tree={docsTree}>
      {children}
    </DocsLayout>
  );
}
