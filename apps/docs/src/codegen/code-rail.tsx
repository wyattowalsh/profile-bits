"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CopyButton } from "../preview/copy-button";

export const CODE_RAIL_TARGET_IDS = ["workflow", "config", "readme"] as const;
export type CodeRailTargetId = (typeof CODE_RAIL_TARGET_IDS)[number];

export const CODE_RAIL_LABELS: Record<CodeRailTargetId, string> = {
  workflow: "Thin workflow YAML",
  config: "Config (.github/profile-bits.yml)",
  readme: "README markdown",
};

export const CODE_RAIL_DEFAULT_TAB: CodeRailTargetId = "workflow";

export type CodeRailValues = {
  workflowYml: string;
  configYml: string;
  readmeMd: string;
};

export type CodeRailTarget = {
  id: CodeRailTargetId;
  label: string;
  value: string;
};

const VALUE_KEY: Record<CodeRailTargetId, keyof CodeRailValues> = {
  workflow: "workflowYml",
  config: "configYml",
  readme: "readmeMd",
};

const CODE_RAIL_CSS = `
[data-slot="code-rail"] {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}
[data-slot="code-rail-toolbar"] {
  display: flex;
  justify-content: flex-end;
  margin-block-end: 0.5rem;
}
[data-slot="code-rail-source"] {
  margin: 0;
  padding: 0.75rem;
  overflow: auto;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-muted);
  color: var(--color-fd-foreground);
  font-size: 0.8125rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
`;

export function isCodeRailTargetId(value: string): value is CodeRailTargetId {
  return (CODE_RAIL_TARGET_IDS as readonly string[]).includes(value);
}

/** Maps playground emit strings onto the three labeled copy targets. */
export function codeRailTargets(values: CodeRailValues): CodeRailTarget[] {
  return CODE_RAIL_TARGET_IDS.map((id) => ({
    id,
    label: CODE_RAIL_LABELS[id],
    value: values[VALUE_KEY[id]],
  }));
}

export type CodeRailProps = CodeRailValues & {
  tab?: CodeRailTargetId;
  defaultTab?: CodeRailTargetId;
  onTabChange?: (tab: CodeRailTargetId) => void;
  className?: string;
};

/**
 * Playground right-rail copy UI: thin workflow YAML, `.github/profile-bits.yml`,
 * and README markdown. Primary CTA is CopyButton. Playground-only.
 */
export function CodeRail({
  workflowYml,
  configYml,
  readmeMd,
  tab,
  defaultTab = CODE_RAIL_DEFAULT_TAB,
  onTabChange,
  className,
}: CodeRailProps) {
  const targets = codeRailTargets({
    workflowYml,
    configYml,
    readmeMd,
  });

  return (
    <>
      <style href="profile-bits-code-rail" precedence="default">
        {CODE_RAIL_CSS}
      </style>
      <section
        data-slot="code-rail"
        aria-label="Playground copy targets"
        className={cn(className)}
      >
        <Tabs
          defaultValue={defaultTab}
          value={tab}
          onValueChange={(value) => {
            if (isCodeRailTargetId(value)) {
              onTabChange?.(value);
            }
          }}
        >
          <TabsList>
            {targets.map((target) => (
              <TabsTrigger key={target.id} value={target.id}>
                {target.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {targets.map((target) => (
            <TabsContent key={target.id} value={target.id}>
              <div data-slot="code-rail-toolbar">
                <CopyButton value={target.value} />
              </div>
              <pre
                data-slot="code-rail-source"
                data-code-rail-target={target.id}
              >
                <code>{target.value}</code>
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </>
  );
}
