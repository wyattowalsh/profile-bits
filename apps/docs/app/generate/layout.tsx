import { HomeLayout } from "fumadocs-ui/layouts/home";
import { type ReactNode, Suspense } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { GenerateShell } from "@/src/generate/shell";

export default function GenerateLayout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout {...baseOptions()}>
      <Suspense>
        <GenerateShell>{children}</GenerateShell>
      </Suspense>
    </HomeLayout>
  );
}
