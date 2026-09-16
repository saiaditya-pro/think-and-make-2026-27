"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { Cluster, InquibuddySubmission, Paginated } from "@/lib/types";

import { TeamCard } from "./team-card";

export function InquibuddyFlow({ schoolId }: { schoolId: number }) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();

  const [grade, setGrade] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [viewing, setViewing] = useState(false);

  const clustersQuery = useQuery({
    queryKey: ["clusters", schoolId],
    queryFn: () => apiFetch<Paginated<Cluster>>(`/clusters/?school=${schoolId}`, accessToken),
    enabled: !!accessToken,
  });

  const gradeSections = useMemo(() => {
    const set = new Map<string, { grade: number; section: string }>();
    for (const c of clustersQuery.data?.results ?? []) {
      set.set(`${c.grade}::${c.section}`, { grade: c.grade, section: c.section });
    }
    return [...set.values()].sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section));
  }, [clustersQuery.data]);

  const submissionsQuery = useQuery({
    queryKey: ["inquibuddy-submissions", schoolId, grade, section],
    queryFn: () =>
      apiFetch<Paginated<InquibuddySubmission>>(
        `/inquibuddy-submissions/?team__cluster__school=${schoolId}&team__cluster__grade=${grade}&team__cluster__section=${section}`,
        accessToken,
      ),
    enabled: viewing && !!accessToken && !!grade && !!section,
    refetchInterval: (query) =>
      query.state.data?.results.some((s) => s.status === "processing") ? 4000 : false,
  });

  async function generateAll() {
    try {
      await apiFetch(`/inquibuddy-submissions/generate-feedback-bulk/`, accessToken, {
        method: "POST",
        body: JSON.stringify({ school: schoolId, grade, section }),
      });
      toast.success("Generating AI feedback… this may take a few minutes.");
      queryClient.invalidateQueries({ queryKey: ["inquibuddy-submissions", schoolId, grade, section] });
    } catch {
      toast.error("Could not start feedback generation.");
    }
  }

  async function downloadAll() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/inquibuddy-submissions/report-all/?school=${schoolId}&grade=${grade}&section=${section}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      toast.error("No evaluated teams to download yet.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `InquiBuddy_Gr${grade}${section}_AllTeams.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!viewing) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-600">Select Grade & Section</p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Grade</label>
          <Select value={grade} onValueChange={(v) => setGrade(v ?? "")}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>
              {[...new Set(gradeSections.map((g) => g.grade))].map((g) => (
                <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Section</label>
          <Select value={section} onValueChange={(v) => setSection(v ?? "")}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {gradeSections.filter((g) => String(g.grade) === grade).map((g) => (
                <SelectItem key={g.section} value={g.section}>Section {g.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full bg-sky-500 hover:bg-sky-600"
          disabled={!grade || !section}
          onClick={() => setViewing(true)}
        >
          View Teams &rarr;
        </Button>
      </div>
    );
  }

  const submissions = submissionsQuery.data?.results ?? [];
  const anyPhotoReady = submissions.some((s) => s.submission_files.some((f) => f.kind === "photo"));
  const anyEvaluated = submissions.some((s) => s.status === "evaluated");
  const anyProcessing = submissions.some((s) => s.status === "processing");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">
          Grade {grade} · Section {section}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setViewing(false)}>&larr; Back</Button>
      </div>

      {submissionsQuery.isLoading && <p className="text-sm text-slate-500">Loading teams…</p>}

      <div className="space-y-3">
        {submissions.map((s) => (
          <TeamCard key={s.id} submission={s} schoolId={schoolId} grade={grade} section={section} />
        ))}
      </div>

      <Button className="w-full bg-sky-500 hover:bg-sky-600" disabled={!anyPhotoReady || anyProcessing} onClick={generateAll}>
        {anyProcessing ? "Generating AI feedback… this may take a few minutes." : "Generate Feedback for All Submitted Teams"}
      </Button>

      {anyEvaluated && (
        <Button variant="outline" className="w-full border-emerald-400 text-emerald-700" onClick={downloadAll}>
          &darr; Download All Teams Feedback PDF
        </Button>
      )}
    </div>
  );
}
