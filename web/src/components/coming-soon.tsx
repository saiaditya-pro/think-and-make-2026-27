import { Construction } from "lucide-react";

import { DashboardMain } from "@/components/dashboard-main";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <DashboardMain title={title}>
      <div className="flex flex-col items-center pt-10 text-center text-slate-500">
        <Construction className="size-8 mb-3" />
        <p className="font-medium text-slate-700">This screen isn&apos;t built yet.</p>
        <p className="text-sm mt-1">
          The Django API for this module is live at <code className="text-xs bg-slate-200 px-1 rounded">/api/v1/</code>
          {" "}— this page just needs its UI wired up next.
        </p>
      </div>
    </DashboardMain>
  );
}
