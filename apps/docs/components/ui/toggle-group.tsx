"use client";

import {
  type ComponentProps,
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToggleGroupContextValue = {
  type: "single" | "multiple";
  values: string[];
  toggle: (value: string) => void;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

function useToggleGroupContext() {
  const context = use(ToggleGroupContext);

  if (!context) {
    throw new Error("ToggleGroupItem must be used within <ToggleGroup>");
  }

  return context;
}

export function ToggleGroup({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: ComponentProps<"fieldset"> & {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
}) {
  const initial =
    defaultValue === undefined
      ? []
      : Array.isArray(defaultValue)
        ? defaultValue
        : [defaultValue];
  const [uncontrolled, setUncontrolled] = useState<string[]>(initial);
  const values =
    value === undefined ? uncontrolled : Array.isArray(value) ? value : [value];

  const toggle = useCallback(
    (itemValue: string) => {
      const next =
        type === "single"
          ? values.includes(itemValue)
            ? []
            : [itemValue]
          : values.includes(itemValue)
            ? values.filter((entry) => entry !== itemValue)
            : [...values, itemValue];

      if (value === undefined) {
        setUncontrolled(next);
      }

      onValueChange?.(type === "single" ? (next[0] ?? "") : next);
    },
    [onValueChange, type, value, values],
  );

  const context = useMemo(
    () => ({ type, values, toggle }),
    [toggle, type, values],
  );

  return (
    <ToggleGroupContext value={context}>
      <fieldset data-slot="toggle-group" className={cn(className)} {...props}>
        {children}
      </fieldset>
    </ToggleGroupContext>
  );
}

export function ToggleGroupItem({
  value,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { value: string }) {
  const group = useToggleGroupContext();
  const pressed = group.values.includes(value);

  return (
    <button
      type="button"
      data-slot="toggle-group-item"
      aria-pressed={pressed}
      className={cn(className)}
      onClick={() => group.toggle(value)}
      {...props}
    >
      {children}
    </button>
  );
}
