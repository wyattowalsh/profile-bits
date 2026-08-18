import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Field({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field" className={cn(className)} {...props} />;
}

export function FieldLabel({
  className,
  htmlFor,
  children,
  ...props
}: ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      htmlFor={htmlFor}
      className={cn(className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p data-slot="field-description" className={cn(className)} {...props} />
  );
}

export function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn(className)} {...props} />;
}
