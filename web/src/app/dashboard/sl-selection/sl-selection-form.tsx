"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/forms/field";
import { usePartnerSchoolPicker } from "@/components/forms/partner-school-picker";
import { SectionCard } from "@/components/forms/section-card";
import { StatusBanner } from "@/components/forms/status-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiErrorMessage } from "@/lib/api-error";
import { parseGradesOffered } from "@/lib/grades";

import { useBulkSubmitSLSelections, useSLSelectionsForGradeSection } from "./use-sl-selection-data";

const REQUIRED = "Required";
const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const SL_STATUS_OPTIONS = [
  { value: "selected", label: "Selected" },
  { value: "not_selected", label: "Not Selected" },
  { value: "pending", label: "Pending" },
];

function enumField(allowed: readonly string[]) {
  return z.string().refine((v) => allowed.includes(v), REQUIRED);
}

const slEntrySchema = z.object({
  sl_name: z.string().min(1, REQUIRED),
  interested_in_role: enumField(YES_NO_OPTIONS.map((o) => o.value)),
  attendance_above_90: enumField(YES_NO_OPTIONS.map((o) => o.value)),
  sl_status: enumField(SL_STATUS_OPTIONS.map((o) => o.value)),
  speaks_clearly: enumField(YES_NO_OPTIONS.map((o) => o.value)),
  speaks_loudly: enumField(YES_NO_OPTIONS.map((o) => o.value)),
  understands_english: enumField(YES_NO_OPTIONS.map((o) => o.value)),
});

const slSelectionSchema = z
  .object({
    grade: z.string().min(1, "Select a grade"),
    section: z.string().min(1, REQUIRED).max(5, "Max 5 characters"),
    teacherChip: z.string(),
    teacherOverride: z.string(),
    sls: z.array(slEntrySchema).min(1, "Add at least one SL"),
    teacher_acknowledged: enumField(YES_NO_OPTIONS.map((o) => o.value)),
  })
  .refine((v) => v.teacherChip.trim() !== "" || v.teacherOverride.trim() !== "", {
    message: "Select or enter a teacher",
    path: ["teacherOverride"],
  });

type FormValues = z.infer<typeof slSelectionSchema>;

const EMPTY_SL_ENTRY: FormValues["sls"][number] = {
  sl_name: "",
  interested_in_role: "",
  attendance_above_90: "",
  sl_status: "",
  speaks_clearly: "",
  speaks_loudly: "",
  understands_english: "",
};

const EMPTY_VALUES: FormValues = {
  grade: "",
  section: "",
  teacherChip: "",
  teacherOverride: "",
  sls: [EMPTY_SL_ENTRY],
  teacher_acknowledged: "",
};

function buildPayload(values: FormValues) {
  const teacher = values.teacherOverride.trim() || values.teacherChip;
  return {
    grade: Number(values.grade),
    section: values.section.toUpperCase(),
    teacher,
    teacher_acknowledged: values.teacher_acknowledged === "yes",
    entries: values.sls.map((s) => ({
      sl_name: s.sl_name,
      interested_in_role: s.interested_in_role === "yes",
      attendance_above_90: s.attendance_above_90 === "yes",
      sl_status: s.sl_status,
      speaks_clearly: s.speaks_clearly === "yes",
      speaks_loudly: s.speaks_loudly === "yes",
      understands_english: s.understands_english === "yes",
    })),
  };
}

export function SLSelectionForm() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";

  const form = useForm<FormValues>({
    resolver: zodResolver(slSelectionSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { schoolId, school, picker } = usePartnerSchoolPicker({
    isAdmin,
    onPartnerChange: () => form.reset(EMPTY_VALUES),
  });

  const { fields: slFields, append: appendSl, remove: removeSl } = useFieldArray({
    control: form.control,
    name: "sls",
  });

  const grade = useWatch({ control: form.control, name: "grade" });
  const section = useWatch({ control: form.control, name: "section" });
  const teacherChip = useWatch({ control: form.control, name: "teacherChip" });

  const dupQuery = useSLSelectionsForGradeSection(schoolId, grade, section);
  const existing = dupQuery.data?.results ?? [];
  const duplicateBlocked = existing.length > 0;
  const bulkSubmit = useBulkSubmitSLSelections(schoolId);

  const grades = parseGradesOffered(school);
  const form2Missing = !!school && !school.form2_submitted;
  const locked = duplicateBlocked && !isAdmin;
  const fieldsDisabled = !schoolId || form2Missing || locked;
  const errors = form.formState.errors;

  const teachersForGrade = (school?.teachers ?? []).filter((t) =>
    t.grades_taught
      .split(",")
      .map(Number)
      .includes(Number(grade)),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await bulkSubmit.mutateAsync(buildPayload(values));
      toast.success("SL Selection submitted.");
      form.reset(EMPTY_VALUES);
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Could not submit.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-24">
      <SectionCard id="who-and-where" badge="Visit" title="Who & where">
        {picker}

        {form2Missing && (
          <StatusBanner
            title="Schools Contact Info (Form 2) must be submitted first."
            action={
              <Link
                href="/dashboard/schools/contact-info"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Go to Form 2
              </Link>
            }
          />
        )}
      </SectionCard>

      {school && !form2Missing && (
        <SectionCard id="section-grade" badge="A" title="Grade & section">
          <Controller
            control={form.control}
            name="grade"
            render={({ field }) => (
              <Field label="Grade" required error={errors.grade?.message}>
                <ToggleGroup
                  value={field.value ? [field.value] : []}
                  onValueChange={(v: string[]) => {
                    field.onChange(v[0] ?? "");
                    form.setValue("teacherChip", "");
                  }}
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

          <Controller
            control={form.control}
            name="section"
            render={({ field }) => (
              <Field label="Section" required error={errors.section?.message}>
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  placeholder="e.g. A"
                  disabled={!grade}
                />
              </Field>
            )}
          />

          {duplicateBlocked && (
            <StatusBanner
              title="Already submitted for this grade/section."
              body={`SL Selection data has already been recorded (${existing
                .map((e) => e.sl_name)
                .join(", ")}). ${isAdmin ? "You can add more as an admin." : "Please contact admin to make any changes."}`}
            />
          )}
        </SectionCard>
      )}

      {school && !form2Missing && grade && section.trim() && !locked && (
        <>
          <SectionCard id="section-teacher" badge="B" title="Teacher">
            {teachersForGrade.length > 0 && (
              <Controller
                control={form.control}
                name="teacherChip"
                render={({ field }) => (
                  <Field label="Select teacher">
                    <ToggleGroup
                      value={field.value ? [field.value] : []}
                      onValueChange={(v: string[]) => field.onChange(v[0] ?? "")}
                      disabled={fieldsDisabled}
                    >
                      {teachersForGrade.map((t) => (
                        <ToggleGroupItem key={t.id} value={t.name}>
                          {t.name}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                )}
              />
            )}
            <Field
              label={teacherChip ? "Or enter a different teacher name" : "Enter teacher name"}
              required={!teacherChip}
              error={errors.teacherOverride?.message}
            >
              <Input {...form.register("teacherOverride")} disabled={fieldsDisabled} />
            </Field>
          </SectionCard>

          <SectionCard id="section-sls" badge="C" title="Student Leaders">
            {slFields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">SL {index + 1}</p>
                  {slFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={fieldsDisabled}
                      onClick={() => removeSl(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <Field label="SL name" required error={errors.sls?.[index]?.sl_name?.message}>
                  <Input {...form.register(`sls.${index}.sl_name`)} disabled={fieldsDisabled} />
                </Field>

                <Controller
                  control={form.control}
                  name={`sls.${index}.interested_in_role`}
                  render={({ field: f }) => (
                    <Field label="Interested in role?" required error={errors.sls?.[index]?.interested_in_role?.message}>
                      <ToggleGroup value={f.value ? [f.value] : []} onValueChange={(v: string[]) => f.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                        {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
                      </ToggleGroup>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`sls.${index}.attendance_above_90`}
                  render={({ field: f }) => (
                    <Field label="Attendance > 90% last year?" required error={errors.sls?.[index]?.attendance_above_90?.message}>
                      <ToggleGroup value={f.value ? [f.value] : []} onValueChange={(v: string[]) => f.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                        {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
                      </ToggleGroup>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`sls.${index}.sl_status`}
                  render={({ field: f }) => (
                    <Field label="SL status" required error={errors.sls?.[index]?.sl_status?.message}>
                      <Select items={SL_STATUS_OPTIONS} value={f.value} onValueChange={(v) => f.onChange(v ?? "")} disabled={fieldsDisabled}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {SL_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`sls.${index}.speaks_clearly`}
                  render={({ field: f }) => (
                    <Field label="Speaks clearly?" required error={errors.sls?.[index]?.speaks_clearly?.message}>
                      <ToggleGroup value={f.value ? [f.value] : []} onValueChange={(v: string[]) => f.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                        {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
                      </ToggleGroup>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`sls.${index}.speaks_loudly`}
                  render={({ field: f }) => (
                    <Field label="Speaks loudly?" required error={errors.sls?.[index]?.speaks_loudly?.message}>
                      <ToggleGroup value={f.value ? [f.value] : []} onValueChange={(v: string[]) => f.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                        {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
                      </ToggleGroup>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`sls.${index}.understands_english`}
                  render={({ field: f }) => (
                    <Field label="Understands English passage & explains in Telugu?" required error={errors.sls?.[index]?.understands_english?.message}>
                      <ToggleGroup value={f.value ? [f.value] : []} onValueChange={(v: string[]) => f.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                        {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
                      </ToggleGroup>
                    </Field>
                  )}
                />
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fieldsDisabled}
              onClick={() => appendSl(EMPTY_SL_ENTRY)}
            >
              <Plus className="size-4" /> Add another SL
            </Button>
          </SectionCard>

          <SectionCard id="section-ack" badge="D" title="Sign-off">
            <Controller
              control={form.control}
              name="teacher_acknowledged"
              render={({ field }) => (
                <Field label="Teacher acknowledgement" required error={errors.teacher_acknowledged?.message}>
                  <p className="text-xs text-muted-foreground -mt-1 mb-1">Teacher approved this SL selection data.</p>
                  <ToggleGroup value={field.value ? [field.value] : []} onValueChange={(v: string[]) => field.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                    {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
                  </ToggleGroup>
                </Field>
              )}
            />
          </SectionCard>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            type="submit"
            className="flex-1 bg-sky-500 hover:bg-sky-600"
            disabled={fieldsDisabled || bulkSubmit.isPending || !section.trim()}
          >
            {bulkSubmit.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      </div>
    </form>
  );
}
