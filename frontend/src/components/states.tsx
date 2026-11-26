import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Couldn't load data",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("surface flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center", className)}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-300">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-cloud/55">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw /> Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-cloud/15 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-sun/10 text-sun [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <p className="font-serif text-2xl font-normal tracking-normal">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-cloud/55">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
