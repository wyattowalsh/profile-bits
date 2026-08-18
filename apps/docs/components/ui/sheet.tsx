"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useId,
  useMemo,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

type SheetContextValue = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  titleId: string;
  open: () => void;
  close: () => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = use(SheetContext);

  if (!context) {
    throw new Error("Sheet components must be used within <Sheet>");
  }

  return context;
}

export function Sheet({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const value = useMemo(
    () => ({
      dialogRef,
      titleId,
      open: () => dialogRef.current?.showModal(),
      close: () => dialogRef.current?.close(),
    }),
    [titleId],
  );

  return <SheetContext value={value}>{children}</SheetContext>;
}

export function SheetTrigger({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  const sheet = useSheetContext();

  return (
    <button
      type="button"
      data-slot="sheet-trigger"
      className={cn(className)}
      onClick={sheet.open}
      {...props}
    >
      {children}
    </button>
  );
}

export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<"dialog">) {
  const sheet = useSheetContext();

  return (
    <dialog
      ref={sheet.dialogRef}
      data-slot="sheet-content"
      aria-labelledby={sheet.titleId}
      className={cn(className)}
      {...props}
    >
      {children}
    </dialog>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn(className)} {...props} />;
}

export function SheetTitle({ className, ...props }: ComponentProps<"h2">) {
  const sheet = useSheetContext();

  return (
    <h2
      id={sheet.titleId}
      data-slot="sheet-title"
      className={cn(className)}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p data-slot="sheet-description" className={cn(className)} {...props} />
  );
}

export function SheetClose({
  className,
  children = "Close",
  ...props
}: ComponentProps<"button">) {
  const sheet = useSheetContext();

  return (
    <button
      type="button"
      data-slot="sheet-close"
      className={cn(className)}
      onClick={sheet.close}
      {...props}
    >
      {children}
    </button>
  );
}
