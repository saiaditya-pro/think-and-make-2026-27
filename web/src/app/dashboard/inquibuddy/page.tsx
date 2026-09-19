import { auth } from "@/auth";
import { DashboardMain } from "@/components/dashboard-main";

import { InquibuddyFlow } from "./inquibuddy-flow";

export default async function Page() {
  const session = await auth();

  return (
    <DashboardMain title="Inqui Buddy — Innovation Evaluator">
      {session?.user.role === "school" && session.user.schoolId ? (
        <InquibuddyFlow schoolId={session.user.schoolId} />
      ) : (
        <p className="text-sm text-slate-500">
          Inqui Buddy submissions are per-school. Sign in with a school account to use this screen.
        </p>
      )}
    </DashboardMain>
  );
}
