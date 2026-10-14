import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variantStyles = {
      primary:
        "bg-indigo-900 text-white hover:bg-indigo-950 active:bg-indigo-900 shadow-xs border border-indigo-900",
      secondary:
        "bg-stone-100 text-stone-900 hover:bg-stone-200 border border-stone-200",
      outline:
        "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-400 shadow-2xs",
      ghost:
        "text-stone-700 hover:bg-stone-100 hover:text-stone-900 border-transparent",
      danger:
        "bg-rose-700 text-white hover:bg-rose-800 active:bg-rose-900 border border-rose-700",
    };

    const sizeStyles = {
      sm: "h-8 px-2.5 text-xs rounded-md gap-1.5",
      md: "h-9 px-3.5 text-sm rounded-md gap-2",
      lg: "h-10 px-5 text-sm font-medium rounded-lg gap-2.5",
      icon: "h-8 w-8 p-0 rounded-md flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-1",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
