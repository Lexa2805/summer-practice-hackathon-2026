import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  variant = "default"
}: {
  status: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}) {
  const variants = {
    default: "bg-muted text-foreground",
    success: "border-primary/30 bg-primary/10 text-primary",
    warning: "border-accent/30 bg-accent/10 text-accent-foreground",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    info: "border-secondary/30 bg-secondary/10 text-secondary-foreground"
  };

  return (
    <Badge className={cn(variants[variant])}>
      {status}
    </Badge>
  );
}
