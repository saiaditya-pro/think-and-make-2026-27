import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function SectionCard({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={id}>
      <CardContent className="space-y-4 py-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-brand-teal" />
          <p className="text-sm font-semibold text-slate-800">{title}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
