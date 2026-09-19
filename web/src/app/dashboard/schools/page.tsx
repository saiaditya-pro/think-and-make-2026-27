import { auth } from "@/auth";
import { DashboardMain } from "@/components/dashboard-main";

import { ReportsDashboard } from "../reports/reports-dashboard";
import { SchoolsList } from "./schools-list";

export default async function Page() {
  const session = await auth();

  if (session?.user.role === "school") {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6">
        <ReportsDashboard />
      </main>
    );
  }

  return (
    <DashboardMain title="Schools">
      <SchoolsList />
    </DashboardMain>
  );
}
