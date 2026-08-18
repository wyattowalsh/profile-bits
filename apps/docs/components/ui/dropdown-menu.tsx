"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  menuId: string;
  triggerId: string;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(
  null,
);

function useDropdownMenuContext() {
  const context = use(DropdownMenuContext);

  if (!context) {
    throw new Error(
      "DropdownMenu components must be used within <DropdownMenu>",
    );
  }

  return context;
}

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerId = useId();
  const value = useMemo(
    () => ({ open, setOpen, menuId, triggerId }),
    [menuId, open, triggerId],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <DropdownMenuContext value={value}>
      <div data-slot="dropdown-menu">{children}</div>
    </DropdownMenuContext>
  );
}

export function DropdownMenuTrigger({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  const menu = useDropdownMenuContext();

  return (
    <button
      type="button"
      id={menu.triggerId}
      data-slot="dropdown-menu-trigger"
      aria-haspopup="menu"
      aria-expanded={menu.open}
      aria-controls={menu.menuId}
      className={cn(className)}
      onClick={() => menu.setOpen(!menu.open)}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const menu = useDropdownMenuContext();

  if (!menu.open) {
    return null;
  }

  return (
    <div
      id={menu.menuId}
      data-slot="dropdown-menu-content"
      role="menu"
      aria-labelledby={menu.triggerId}
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  className,
  onClick,
  ...props
}: ComponentProps<"button">) {
  const menu = useDropdownMenuContext();

  return (
    <button
      type="button"
      data-slot="dropdown-menu-item"
      role="menuitem"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        menu.setOpen(false);
      }}
      {...props}
    />
  );
}
