import { DashboardMain } from "@/components/dashboard-main";

import { SchoolsList } from "./schools-list";

export default function Page() {
  return (
    <DashboardMain title="Schools">
      <SchoolsList />
    </DashboardMain>
  );
}
