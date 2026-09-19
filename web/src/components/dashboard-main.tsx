export function DashboardMain({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-slate-800">{title}</h1>
      {children}
    </main>
  );
}
