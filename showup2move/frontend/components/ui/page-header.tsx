import { cn } from "@/lib/utils";

export function PageHeader({
  label,
  title,
  subtitle,
  action,
  className
}: {
  label: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end", className)}>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{label}</p>
        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
