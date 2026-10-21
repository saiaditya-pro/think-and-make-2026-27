import { ObservationsForm } from "@/app/dashboard/observations/observations-form";
import { DashboardMain } from "@/components/dashboard-main";

export default function Page() {
  return (
    <DashboardMain title="Session Observations">
      <ObservationsForm />
    </DashboardMain>
  );
}
