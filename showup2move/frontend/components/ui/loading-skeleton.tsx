import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <LoadingSkeleton className="h-6 w-3/4" />
      <LoadingSkeleton className="mt-4 h-4 w-full" />
      <LoadingSkeleton className="mt-2 h-4 w-5/6" />
      <div className="mt-4 flex gap-2">
        <LoadingSkeleton className="h-10 w-24" />
        <LoadingSkeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="space-y-6">
      <div>
        <LoadingSkeleton className="h-4 w-32" />
        <LoadingSkeleton className="mt-2 h-10 w-64" />
        <LoadingSkeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    </div>
  );
}
