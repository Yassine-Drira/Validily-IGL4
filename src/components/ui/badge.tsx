import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "indigo" | "cobalt";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-[#111A2E] text-white border-transparent",
    secondary: "bg-[#F4F6FA] text-[#182235] border-[#E4E8F0]",
    outline: "border-[#E4E8F0] text-[#68748A] bg-white",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    indigo: "bg-[#EDF2FF] text-[#2855D9] border-[#2855D9]/20 font-medium",
    cobalt: "bg-[#EDF2FF] text-[#2855D9] border-[#2855D9]/20 font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-mono transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
