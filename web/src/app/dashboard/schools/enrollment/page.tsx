import { DashboardMain } from "@/components/dashboard-main";

import { EnrollmentForm } from "./enrollment-form";

export default function Page() {
  return (
    <DashboardMain title="School Enrollment — Form 1">
      <EnrollmentForm />
    </DashboardMain>
  );
}
