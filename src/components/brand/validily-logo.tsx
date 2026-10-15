import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ValidilyLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  subtitle?: string;
  asLink?: boolean;
  href?: string;
}

export function ValidilySymbol({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "relative shrink-0 flex items-center justify-center select-none",
        sizeMap[size],
        className
      )}
    >
      <svg
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xs transition-transform duration-200 group-hover:scale-105"
      >
        <g transform="rotate(-6 128 128)">
          {/* Deep Navy Rounded Rect Card */}
          <rect
            x="48"
            y="28"
            width="160"
            height="200"
            rx="30"
            fill="#111A2E"
          />
          {/* Bold Geometric Checkmark */}
          <path
            d="M74 116 L124 166 L178 82 L156 68 L118 130 L92 104 Z"
            fill="#FFFFFF"
          />
          {/* Gold Apex Accent */}
          <circle cx="170" cy="70" r="16" fill="#D4A346" />
        </g>
      </svg>
    </div>
  );
}

export function ValidilyLogo({
  className,
  size = "md",
  showWordmark = true,
  subtitle = "Academic Revision",
  asLink = true,
  href = "/",
}: ValidilyLogoProps) {
  const content = (
    <div className={cn("inline-flex items-center space-x-3 group", className)}>
      <ValidilySymbol size={size} />
      {showWordmark && (
        <div className="flex flex-col text-left">
          <span className="font-bold text-sm tracking-tight text-[#111A2E] leading-tight font-sans">
            validily-IGL4
          </span>
          {subtitle && (
            <span className="text-[11px] text-[#68748A] font-sans leading-none mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
