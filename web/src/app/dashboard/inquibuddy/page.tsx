import { auth } from "@/auth";
import { SubHeader } from "@/components/sub-header";

import { InquibuddyFlow } from "./inquibuddy-flow";

export default async function Page() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50">
      <SubHeader eyebrow="Inqui Buddy" title="Innovation Evaluator" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {session?.user.role === "school" && session.user.schoolId ? (
          <InquibuddyFlow schoolId={session.user.schoolId} />
        ) : (
          <p className="text-sm text-slate-500">
            Inqui Buddy submissions are per-school. Sign in with a school account to use this screen.
          </p>
        )}
      </main>
    </div>
  );
}
