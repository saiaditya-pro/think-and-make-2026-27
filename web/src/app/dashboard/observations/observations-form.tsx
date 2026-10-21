"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Loader2, MapPin, NotebookPen } from "lucide-react";
import { useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/forms/field";
import { usePartnerSchoolPicker } from "@/components/forms/partner-school-picker";
import { SectionCard } from "@/components/forms/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiErrorMessage } from "@/lib/api-error";
import { parseGradesOffered } from "@/lib/grades";

import { useCreateObservation, useObservationsForSchool } from "./use-observations-data";

const REQUIRED = "Required";
const UNIT_OPTIONS = [
  { value: "1", label: "Level 1" },
  { value: "2", label: "Level 2" },
  { value: "3", label: "Level 3" },
];

const observationSchema = z.object({
  grade: z.string().min(1, REQUIRED),
  section: z.string().trim().min(1, REQUIRED).max(5),
  unit: z.string().min(1, REQUIRED),
  session_no: z.coerce.number<string>().int().min(1, REQUIRED),
  observed_by: z.string(),
  date: z.string().min(1, REQUIRED),
  notes: z.string(),
});

type FormInput = z.input<typeof observationSchema>;
type FormValues = z.output<typeof observationSchema>;

const EMPTY_VALUES: FormInput = {
  grade: "",
  section: "",
  unit: "",
  session_no: "",
  observed_by: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

export function ObservationsForm() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: { ...EMPTY_VALUES, observed_by: session?.user.displayName ?? "" },
  });

  const { schoolId, school, picker } = usePartnerSchoolPicker({
    isAdmin,
    onPartnerChange: () => form.reset(EMPTY_VALUES),
  });

  const observationsQuery = useObservationsForSchool(schoolId);
  const createObservation = useCreateObservation(schoolId);
  const grades = parseGradesOffered(school);
  const errors = form.formState.errors;
  const fieldsDisabled = !schoolId;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createObservation.mutateAsync({
        ...values,
        grade: Number(values.grade),
        unit: Number(values.unit) as 1 | 2 | 3,
        section: values.section.toUpperCase(),
      });
      toast.success("Observation saved.");
      form.reset({ ...values, session_no: String(values.session_no + 1), notes: "" });
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Could not save the observation.");
    }
  });

  const observations = observationsQuery.data?.results ?? [];

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-24">
      <SectionCard id="who-and-where" icon={MapPin} title="Who & where">
        {picker}
      </SectionCard>

      {school && (
        <>
          <SectionCard id="section-session" icon={NotebookPen} title="Observed session">
            <Controller
              control={form.control}
              name="grade"
              render={({ field }) => (
                <Field label="Grade" required error={errors.grade?.message}>
                  <ToggleGroup
                    value={field.value ? [field.value] : []}
                    onValueChange={(v: string[]) => field.onChange(v[0] ?? "")}
                    disabled={fieldsDisabled}
                  >
                    {grades.map((g) => (
                      <ToggleGroupItem key={g} value={String(g)}>
                        Grade {g}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              )}
            />
            <Field label="Section" required error={errors.section?.message}>
              <Input {...form.register("section")} placeholder="e.g. A" disabled={fieldsDisabled} />
            </Field>
            <Controller
              control={form.control}
              name="unit"
              render={({ field }) => (
                <Field label="Level" required error={errors.unit?.message}>
                  <ToggleGroup
                    value={field.value ? [field.value] : []}
                    onValueChange={(v: string[]) => field.onChange(v[0] ?? "")}
                    disabled={fieldsDisabled}
                  >
                    {UNIT_OPTIONS.map((o) => (
                      <ToggleGroupItem key={o.value} value={o.value}>
                        {o.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              )}
            />
            <Field label="Session number" required error={errors.session_no?.message}>
              <Input type="number" min={1} {...form.register("session_no")} disabled={fieldsDisabled} />
            </Field>
            <Field label="Date" required error={errors.date?.message}>
              <Input type="date" {...form.register("date")} disabled={fieldsDisabled} />
            </Field>
            <Field label="Observed by">
              <Input {...form.register("observed_by")} disabled={fieldsDisabled} />
            </Field>
            <Field label="Notes">
              <Textarea {...form.register("notes")} rows={3} disabled={fieldsDisabled} />
            </Field>
          </SectionCard>

          <SectionCard id="section-history" icon={ClipboardList} title="Recorded sessions">
            {observationsQuery.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
            {!observationsQuery.isLoading && observations.length === 0 && (
              <p className="text-sm text-slate-500">No sessions observed yet for this school.</p>
            )}
            {observations.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="py-2 pr-2">Class</th>
                      <th className="py-2 pr-2">Level</th>
                      <th className="py-2 pr-2">Session</th>
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Observed by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="py-2 pr-2">
                          {o.grade}
                          {o.section}
                        </td>
                        <td className="py-2 pr-2">L{o.unit}</td>
                        <td className="py-2 pr-2">#{o.session_no}</td>
                        <td className="py-2 pr-2">{o.date}</td>
                        <td className="py-2 pr-2">{o.observed_by || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            type="submit"
            className="flex-1 bg-brand-coral hover:bg-brand-coral-dark"
            disabled={fieldsDisabled || createObservation.isPending}
          >
            {createObservation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save observation"}
          </Button>
        </div>
      </div>
    </form>
  );
}
