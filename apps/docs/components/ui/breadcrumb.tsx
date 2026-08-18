import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Breadcrumb({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      data-slot="breadcrumb"
      aria-label="Breadcrumb"
      className={cn(className)}
      {...props}
    />
  );
}

export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol data-slot="breadcrumb-list" className={cn(className)} {...props} />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-item" className={cn(className)} {...props} />
  );
}

export function BreadcrumbLink({ className, ...props }: ComponentProps<"a">) {
  return <a data-slot="breadcrumb-link" className={cn(className)} {...props} />;
}

export function BreadcrumbPage({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn(className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  children = "/",
  className,
  ...props
}: ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      {children}
    </li>
  );
}
