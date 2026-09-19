"use client";

import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { SidebarTrigger } from "@/components/ui/sidebar";

const ROLE_LABEL: Record<string, string> = { admin: "ADMIN", iif_staff: "IIF", school: "SCHOOL" };

const BREADCRUMBS: Record<string, [string, string?]> = {
  "/dashboard/reports": ["Dashboard"],
  "/dashboard/schools": ["Schools"],
  "/dashboard/schools/enrollment": ["Forms", "School Enrollment"],
  "/dashboard/schools/contact-info": ["Forms", "Schools Contact Info"],
  "/dashboard/headcounts": ["Forms", "Students Count Info"],
  "/dashboard/sl-selection": ["Forms", "SL Selection Assessment"],
  "/dashboard/kits": ["Forms", "Kits Handover"],
  "/dashboard/inquibuddy": ["Insights", "InquiBuddy"],
  "/dashboard/observations": ["Insights", "Observations"],
};

export function TopBar({ role }: { role: string }) {
  const pathname = usePathname();
  const [section, page] = BREADCRUMBS[pathname] ?? ["Dashboard"];

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <p className="truncate text-sm text-slate-500">
          <span className="hidden sm:inline">Think &amp; Make 2026-27 / </span>
          {page ? (
            <>
              <span className="hidden sm:inline">{section} / </span>
              <span className="font-medium text-slate-700">{page}</span>
            </>
          ) : (
            <span className="font-medium text-slate-700">{section}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden rounded-full bg-brand-coral/10 px-2.5 py-1 text-xs font-semibold text-brand-coral sm:inline-block">
          {ROLE_LABEL[role] ?? role.toUpperCase()}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
