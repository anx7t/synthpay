import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3 text-sun/80">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-[40px] sm:leading-[1.05]">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-cloud/55">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
