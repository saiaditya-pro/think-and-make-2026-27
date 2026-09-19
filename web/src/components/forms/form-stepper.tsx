"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FormStatus } from "@/lib/types";

import { useSchoolProgress } from "./use-school-progress";

type StepKey = "form1" | "form2" | "form3" | "form4" | "form5";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "form1", label: "Enrollment" },
  { key: "form2", label: "Contact Info" },
  { key: "form3", label: "Headcounts" },
  { key: "form4", label: "SL Selection" },
];

function statusFromPct(pct: number): FormStatus {
  if (pct >= 100) return "complete";
  if (pct > 0) return "in_progress";
  return "not_started";
}

function StepCircle({ status, isCurrent, number }: { status: FormStatus; isCurrent: boolean; number: number }) {
  if (status === "complete") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="size-3" />
      </span>
    );
  }
  if (isCurrent) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-brand-teal text-[10px] font-bold text-brand-teal">
        {number}
      </span>
    );
  }
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-medium text-slate-400">
      {number}
    </span>
  );
}

function Step({ label, status, isCurrent, number }: { label: string; status: FormStatus; isCurrent: boolean; number: number }) {
  return (
    <div
      className={cn(
        "flex flex-1 basis-[6.5rem] items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs",
        isCurrent && "bg-white shadow-sm ring-1 ring-slate-200",
      )}
    >
      <StepCircle status={status} isCurrent={isCurrent} number={number} />
      <span className={cn("truncate", isCurrent ? "font-semibold text-slate-800" : "text-slate-400")}>{label}</span>
    </div>
  );
}

/**
 * Horizontal 5-step progress bar shown at the top of each of the 5 forms,
 * driven by GET /api/v1/schools/{id}/progress/ (built for the dashboard in
 * an earlier phase) -- purely additional visual context. It never blocks
 * anything; the existing StatusBanner "Form N must be submitted first"
 * gates inside each form are unaffected.
 */
export function FormStepper({ schoolId, current }: { schoolId: string; current: StepKey }) {
  const { data: progress } = useSchoolProgress(schoolId);
  if (!schoolId || !progress) return null;

  const statuses: Record<StepKey, FormStatus> = {
    form1: progress.form1_status,
    form2: progress.form2_status,
    form3: statusFromPct(progress.form3_pct),
    form4: statusFromPct(progress.form4_pct),
    form5: progress.kit_status,
  };

  return (
    <div className="mb-4 flex flex-wrap items-stretch gap-2">
      <div className="flex flex-1 flex-wrap items-stretch gap-0.5 rounded-xl bg-slate-100 p-1">
        {STEPS.map((step, i) => (
          <Step key={step.key} label={step.label} status={statuses[step.key]} isCurrent={current === step.key} number={i + 1} />
        ))}
      </div>

      <div
        className={cn(
          "flex flex-1 basis-[9rem] flex-col justify-center gap-0.5 rounded-xl bg-slate-100 px-3 py-1.5",
          current === "form5" && "bg-white shadow-sm ring-1 ring-slate-200",
        )}
      >
        <div className="flex items-center gap-1.5 text-xs">
          <StepCircle status={statuses.form5} isCurrent={current === "form5"} number={5} />
          <span className={cn("truncate", current === "form5" ? "font-semibold text-slate-800" : "text-slate-400")}>
            Kit Handover
          </span>
        </div>
        <span className="pl-[26px] text-[10px] uppercase tracking-wide text-slate-400">Independent</span>
      </div>
    </div>
  );
}
