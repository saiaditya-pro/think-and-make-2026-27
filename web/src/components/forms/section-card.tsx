import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function SectionCard({
  id,
  badge,
  title,
  children,
}: {
  id: string;
  badge: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={id}>
      <CardContent className="space-y-4 py-2">
        <div className="flex items-center gap-2">
          {badge.length === 1 ? (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {badge}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {badge}
            </span>
          )}
          <p className="text-sm font-semibold text-slate-800">{title}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
