"use client";

import { useSession } from "next-auth/react";

import { StatusBanner } from "@/components/forms/status-banner";
import { Card, CardContent } from "@/components/ui/card";

import { PercentPill, StatusPill } from "./status-pill";
import { useReportsSummary } from "./use-reports-data";

function KpiCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <Card>
      <CardContent className="py-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function ReportsDashboard() {
  const { data: session } = useSession();
  const isSchool = session?.user.role === "school";
  const { data, isLoading, error } = useReportsSummary();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800" suppressHydrationWarning>
          {greeting()}, {session?.user.displayName ?? "there"} 👋
        </h1>
        <p className="text-sm text-slate-500">Here&apos;s how the program is progressing this week.</p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading dashboard…</p>}
      {(error || (!isLoading && !data)) && (
        <p className="text-sm text-destructive">Could not load the school dashboard.</p>
      )}
      {data && <ReportsBody data={data} isSchool={isSchool} />}
    </div>
  );
}

function ReportsBody({ data, isSchool }: { data: NonNullable<ReturnType<typeof useReportsSummary>["data"]>; isSchool: boolean }) {
  const flaggedSchools = data.schools.filter((s) => s.mismatch_flags.length > 0);

  return (
    <div className="space-y-4">
      {data.kpis && (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Schools Enrolled" value={String(data.kpis.schools_enrolled)} />
          <KpiCard label="Forms Completed" value={`${data.kpis.forms_completed_pct}%`} sublabel="across all schools" />
          <KpiCard label="Kits Delivered" value={String(data.kpis.kits_delivered)} sublabel={`of ${data.kpis.schools_enrolled} schools`} />
          <KpiCard label="Active Student Leaders" value={String(data.kpis.active_student_leaders)} />
        </div>
      )}

      {flaggedSchools.length > 0 && (
        <StatusBanner
          title={`${flaggedSchools.length} school${flaggedSchools.length === 1 ? "" : "s"} have a data-quality flag`}
          body="Total SL entered in Headcounts doesn't match the number of Student Leaders recorded in SL Selection for the same grade-section."
        />
      )}

      {isSchool ? (
        data.schools.length === 0 ? (
          <p className="text-sm text-slate-500">No progress recorded yet.</p>
        ) : (
          <Card>
            <CardContent className="space-y-2 py-2">
              <p className="font-semibold text-slate-800">{data.schools[0].school_name}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-500">Enrollment</span>
                <StatusPill status={data.schools[0].form1_status} />
                <span className="text-slate-500">Contact Info</span>
                <StatusPill status={data.schools[0].form2_status} />
                <span className="text-slate-500">Headcounts</span>
                <PercentPill pct={data.schools[0].form3_pct} />
                <span className="text-slate-500">SL Selection</span>
                <PercentPill pct={data.schools[0].form4_pct} />
                <span className="text-slate-500">Kits</span>
                <StatusPill status={data.schools[0].kit_status} />
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="py-2 pr-2">School</th>
                  <th className="py-2 pr-2">Enrollment</th>
                  <th className="py-2 pr-2">Contact</th>
                  <th className="py-2 pr-2">Headcounts</th>
                  <th className="py-2 pr-2">SL Selection</th>
                  <th className="py-2 pr-2">Kits</th>
                </tr>
              </thead>
              <tbody>
                {data.schools.map((row) => (
                  <tr key={row.school} className="border-t">
                    <td className="py-2 pr-2">
                      <p className="font-medium text-slate-800">{row.school_name}</p>
                      <p className="text-xs text-slate-400">{row.school_code}</p>
                    </td>
                    <td className="py-2 pr-2">
                      <StatusPill status={row.form1_status} />
                    </td>
                    <td className="py-2 pr-2">
                      <StatusPill status={row.form2_status} />
                    </td>
                    <td className="py-2 pr-2">
                      <PercentPill pct={row.form3_pct} />
                    </td>
                    <td className="py-2 pr-2">
                      <PercentPill pct={row.form4_pct} />
                    </td>
                    <td className="py-2 pr-2">
                      <StatusPill status={row.kit_status} />
                    </td>
                  </tr>
                ))}
                {data.schools.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      No schools yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
