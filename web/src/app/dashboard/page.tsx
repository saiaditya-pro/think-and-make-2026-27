import Link from "next/link";

import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DASHBOARD_CARDS } from "@/lib/dashboard-cards";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = { admin: "ADMIN", iif_staff: "IIF", school: "SCHOOL" };

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        right={
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/15 text-white border-0">
              {ROLE_LABEL[session?.user.role ?? "school"]}
            </Badge>
            <SignOutButton />
          </div>
        }
      />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-500 mb-4">Implementation Trackers</p>
        <div className="space-y-3">
          {DASHBOARD_CARDS.map((card) => (
            <Link key={card.title} href={`/dashboard/${card.slug}` as never}>
              <Card
                className={cn(
                  "transition hover:shadow-md hover:-translate-y-0.5",
                  card.highlighted && "border-sky-400 ring-1 ring-sky-200",
                )}
              >
                <CardContent className="flex items-center gap-4 py-1">
                  <card.icon className="size-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">{card.title}</p>
                    <p className="text-sm text-slate-500">{card.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
