import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { SubHeader } from "@/components/sub-header";
import { Badge } from "@/components/ui/badge";

import { EnrollmentForm } from "./enrollment-form";

const ROLE_LABEL: Record<string, string> = { admin: "ADMIN", iif_staff: "IIF", school: "SCHOOL" };

export default async function Page() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50">
      <SubHeader
        eyebrow="INQUI-LAB · THINK & MAKE"
        title="School Enrollment — Form 1"
        backHref="/dashboard"
        right={
          <>
            <Badge variant="secondary" className="bg-white/15 text-white border-0">
              {ROLE_LABEL[session?.user.role ?? "school"]}
            </Badge>
            <SignOutButton />
          </>
        }
      />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <EnrollmentForm />
      </main>
    </div>
  );
}
