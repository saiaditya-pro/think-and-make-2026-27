import { SubHeader } from "@/components/sub-header";

import { SchoolsList } from "./schools-list";

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SubHeader eyebrow="Think & Make 2026-27" title="Schools" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <SchoolsList />
      </main>
    </div>
  );
}
