import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-stone-500 mb-4">
      <Link
        href="/"
        className="flex items-center hover:text-stone-900 transition-colors"
        title="Dashboard Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center space-x-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            {isLast || !item.href ? (
              <span className="font-medium text-stone-900 truncate max-w-[200px] sm:max-w-xs">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-stone-900 transition-colors truncate max-w-[150px] sm:max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
