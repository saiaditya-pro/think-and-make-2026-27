import { HeadcountsForm } from "@/app/dashboard/headcounts/headcounts-form";
import { DashboardMain } from "@/components/dashboard-main";

export default function Page() {
  return (
    <DashboardMain title="Students Count Info — Form 3">
      <HeadcountsForm />
    </DashboardMain>
  );
}
