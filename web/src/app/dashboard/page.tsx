import { auth } from "@/auth";

import { PartnersGrid } from "./partners-grid";
import { ReportsDashboard } from "./reports/reports-dashboard";

export default async function Page() {
  const session = await auth();

  // A school account belongs to one school, so it skips the partner picker.
  if (session?.user.role === "school") {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6">
        <ReportsDashboard />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <PartnersGrid />
    </main>
  );
}
