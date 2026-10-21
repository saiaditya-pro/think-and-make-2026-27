import { EnrollmentForm } from "@/app/dashboard/schools/enrollment/enrollment-form";
import { DashboardMain } from "@/components/dashboard-main";

export default function Page() {
  return (
    <DashboardMain title="School Enrollment — Form 1">
      <EnrollmentForm />
    </DashboardMain>
  );
}
