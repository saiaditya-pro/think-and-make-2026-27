import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function StatusBanner({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-coral/30 bg-brand-coral/10 p-3 text-brand-coral-dark">
      <p className="flex items-start gap-2 text-sm">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold">{title}</span>
          {body ? ` ${body}` : ""}
        </span>
      </p>
      {action}
    </div>
  );
}
