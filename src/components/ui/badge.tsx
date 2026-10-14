import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "indigo";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-stone-900 text-stone-50 border-transparent",
    secondary: "bg-stone-100 text-stone-700 border-stone-200",
    outline: "border-stone-300 text-stone-700 bg-white",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-900 border-indigo-200 font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
