import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Form({ className, ...props }: ComponentProps<"form">) {
  return <form data-slot="form" className={cn(className)} {...props} />;
}
