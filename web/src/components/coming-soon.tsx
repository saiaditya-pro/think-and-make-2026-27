import { Construction } from "lucide-react";

import { SubHeader } from "@/components/sub-header";

export function ComingSoonPage({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <SubHeader eyebrow={eyebrow} title={title} />
      <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center text-slate-500">
        <Construction className="size-8 mb-3" />
        <p className="font-medium text-slate-700">This screen isn&apos;t built yet.</p>
        <p className="text-sm mt-1">
          The Django API for this module is live at <code className="text-xs bg-slate-200 px-1 rounded">/api/v1/</code>
          {" "}— this page just needs its UI wired up next.
        </p>
      </main>
    </div>
  );
}
