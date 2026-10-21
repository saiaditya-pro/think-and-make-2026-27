import { DashboardMain } from "@/components/dashboard-main";

import { ObservationsForm } from "./observations-form";

export default function Page() {
  return (
    <DashboardMain title="Session Observations">
      <ObservationsForm />
    </DashboardMain>
  );
}
