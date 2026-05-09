import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  message,
  retry,
  className
}: {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center", className)}>
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h3 className="mt-3 font-bold text-destructive">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {retry ? (
        <Button onClick={retry} variant="outline" className="mt-4">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive", className)}>
      {message}
    </div>
  );
}

export function SuccessMessage({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary", className)}>
      {message}
    </div>
  );
}
