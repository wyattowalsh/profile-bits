"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = use(TabsContext);

  if (!context) {
    throw new Error("Tabs components must be used within <Tabs>");
  }

  return context;
}

export function Tabs({
  defaultValue,
  value: valueProp,
  onValueChange,
  className,
  children,
  ...props
}: ComponentProps<"div"> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const baseId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? "",
  );
  const value = valueProp ?? uncontrolledValue;
  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) {
        setUncontrolledValue(next);
      }

      onValueChange?.(next);
    },
    [onValueChange, valueProp],
  );
  const context = useMemo(
    () => ({ value, setValue, baseId }),
    [baseId, setValue, value],
  );

  return (
    <TabsContext value={context}>
      <div data-slot="tabs" className={cn(className)} {...props}>
        {children}
      </div>
    </TabsContext>
  );
}

export function TabsList({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { value: string }) {
  const tabs = useTabsContext();
  const selected = tabs.value === value;

  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      role="tab"
      id={`${tabs.baseId}-tab-${value}`}
      aria-controls={`${tabs.baseId}-panel-${value}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      className={cn(className)}
      onClick={() => tabs.setValue(value)}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { value: string; children?: ReactNode }) {
  const tabs = useTabsContext();
  const selected = tabs.value === value;

  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      id={`${tabs.baseId}-panel-${value}`}
      aria-labelledby={`${tabs.baseId}-tab-${value}`}
      hidden={!selected}
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  );
}
