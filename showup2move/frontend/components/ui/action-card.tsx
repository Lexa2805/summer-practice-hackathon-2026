import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ActionCard({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  actionVariant = "default",
  disabled = false
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: () => void;
  actionLabel: string;
  actionVariant?: "default" | "secondary" | "outline" | "accent";
  disabled?: boolean;
}) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <Button onClick={action} variant={actionVariant} disabled={disabled} className="w-full">
              {actionLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
