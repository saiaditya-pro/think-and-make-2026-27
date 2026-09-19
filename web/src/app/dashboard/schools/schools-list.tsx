"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Paginated, School } from "@/lib/types";

export function SchoolsList() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const canEnroll = session?.user.role === "admin" || session?.user.role === "iif_staff";

  const { data, isLoading, error } = useQuery({
    queryKey: ["schools"],
    queryFn: () => apiFetch<Paginated<School>>("/schools/", accessToken),
    enabled: !!accessToken,
  });

  return (
    <div className="space-y-3">
      {canEnroll && (
        <Link href="/dashboard/schools/enrollment" className="block">
          <Button className="w-full bg-brand-coral hover:bg-brand-coral-dark">New / Continue Enrollment</Button>
        </Link>
      )}
      {isLoading && <p className="text-sm text-slate-500">Loading schools…</p>}
      {error && <p className="text-sm text-destructive">Could not load schools.</p>}
      {!isLoading && !error && !data?.results.length && <p className="text-sm text-slate-500">No schools yet.</p>}
      {data?.results.map((school) => (
        <Card key={school.id}>
          <CardContent className="py-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800">{school.name}</p>
              <span className="text-xs font-mono text-slate-400">{school.school_code}</span>
            </div>
            <p className="text-sm text-slate-500">
              {school.district || "—"} · Grades {school.grades_offered || "—"}
            </p>
            {school.principal_name && (
              <p className="text-xs text-slate-400 mt-1">
                Principal: {school.principal_name} {school.principal_phone && `· ${school.principal_phone}`}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
