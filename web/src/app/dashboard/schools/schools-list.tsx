"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Paginated, School } from "@/lib/types";

export function SchoolsList() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  const { data, isLoading, error } = useQuery({
    queryKey: ["schools"],
    queryFn: () => apiFetch<Paginated<School>>("/schools/", accessToken),
    enabled: !!accessToken,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading schools…</p>;
  if (error) return <p className="text-sm text-destructive">Could not load schools.</p>;
  if (!data?.results.length) return <p className="text-sm text-slate-500">No schools yet.</p>;

  return (
    <div className="space-y-3">
      {data.results.map((school) => (
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
