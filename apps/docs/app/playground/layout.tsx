import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { PlaygroundShell } from "@/src/codegen/shell";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Codegen playground for the github pack (demo, stats, languages). Layout preview and copy targets. Primary action is Copy.",
};

export default function PlaygroundLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <HomeLayout {...baseOptions()}>
      <Suspense>
        <PlaygroundShell>{children}</PlaygroundShell>
      </Suspense>
    </HomeLayout>
  );
}
