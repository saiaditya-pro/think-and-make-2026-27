import { ReportsDashboard } from "@/app/dashboard/reports/reports-dashboard";

export default async function Page({ params }: PageProps<"/dashboard/partners/[partnerId]">) {
  const { partnerId } = await params;
  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <ReportsDashboard partnerId={partnerId} />
    </main>
  );
}
