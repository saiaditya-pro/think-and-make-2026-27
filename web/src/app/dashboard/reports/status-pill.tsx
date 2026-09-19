import { cn } from "@/lib/utils";
import type { FormStatus } from "@/lib/types";

const STATUS_LABEL: Record<FormStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

const STATUS_CLASS: Record<FormStatus, string> = {
  not_started: "bg-rose-100 text-rose-600",
  in_progress: "bg-amber-100 text-amber-700",
  complete: "bg-emerald-100 text-emerald-700",
};

export function StatusPill({ status }: { status: FormStatus }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PercentPill({ pct }: { pct: number }) {
  const cls = pct >= 100 ? STATUS_CLASS.complete : pct > 0 ? STATUS_CLASS.in_progress : STATUS_CLASS.not_started;
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", cls)}>{pct}%</span>;
}
