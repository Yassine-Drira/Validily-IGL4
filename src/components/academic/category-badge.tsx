import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  slug?: string;
  name: string;
  className?: string;
}

export function CategoryBadge({ slug, name, className }: CategoryBadgeProps) {
  let variant: "default" | "secondary" | "outline" | "success" | "warning" | "indigo" = "secondary";

  switch (slug) {
    case "courses-notes":
      variant = "indigo";
      break;
    case "exams":
      variant = "warning";
      break;
    case "tp-practical":
      variant = "success";
      break;
    case "cheat-sheets":
      variant = "outline";
      break;
    case "quizzes":
      variant = "secondary";
      break;
    default:
      variant = "secondary";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {name}
    </Badge>
  );
}
