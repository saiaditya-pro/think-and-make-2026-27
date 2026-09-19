"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CheckCircle2, Loader2, MapPin, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/forms/field";
import { FormStepper } from "@/components/forms/form-stepper";
import { usePartnerSchoolPicker } from "@/components/forms/partner-school-picker";
import { SectionCard } from "@/components/forms/section-card";
import { StatusBanner } from "@/components/forms/status-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiErrorMessage } from "@/lib/api-error";
import { parseGradesOffered } from "@/lib/grades";
import type { School } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useSubmitForm2 } from "./use-contact-info-data";

const REQUIRED = "Required";
const DAY_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
];

const teacherSchema = z.object({
  name: z.string().min(1, REQUIRED),
  phone: z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile number"),
  grades_taught: z.array(z.number()).min(1, "Select at least one grade"),
});

const scheduleSchema = z.object({
  grade: z.number(),
  day_of_week: z.string().min(1, REQUIRED),
  time: z.string().min(1, REQUIRED),
});

const contactInfoSchema = z.object({
  iif_poc: z.string().min(1, REQUIRED),
  teachers: z.array(teacherSchema).min(1, "Add at least one teacher"),
  schedules: z.array(scheduleSchema),
});

type FormValues = z.infer<typeof contactInfoSchema>;

const EMPTY_VALUES: FormValues = {
  iif_poc: "",
  teachers: [{ name: "", phone: "", grades_taught: [] }],
  schedules: [],
};

function schoolToFormValues(school: School): FormValues {
  const grades = parseGradesOffered(school);
  return {
    iif_poc: school.iif_poc || "",
    teachers: school.teachers.length
      ? school.teachers.map((t) => ({
          name: t.name,
          phone: t.phone,
          grades_taught: t.grades_taught
            ? t.grades_taught.split(",").map(Number).filter((n) => !Number.isNaN(n))
            : [],
        }))
      : [{ name: "", phone: "", grades_taught: grades.length === 1 ? grades : [] }],
    schedules: grades.map((g) => {
      const existing = school.session_schedules.find((s) => s.grade === g);
      return { grade: g, day_of_week: existing?.day_of_week ?? "", time: existing?.time?.slice(0, 5) ?? "" };
    }),
  };
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function TeacherAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-xs font-semibold text-brand-teal">
      {initialsOf(name)}
    </span>
  );
}

const ROW_TONE = [
  { bg: "bg-brand-teal/10", text: "text-brand-teal" },
  { bg: "bg-brand-coral/10", text: "text-brand-coral" },
];

function ScheduleRow({
  grade,
  index,
  control,
  disabled,
}: {
  grade: number;
  index: number;
  control: Control<FormValues>;
  disabled: boolean;
}) {
  const tone = ROW_TONE[index % ROW_TONE.length];

  return (
    <Controller
      control={control}
      name={`schedules.${index}.day_of_week`}
      render={({ field: dayField }) => (
        <Controller
          control={control}
          name={`schedules.${index}.time`}
          render={({ field: timeField }) => (
            <tr className="border-t">
              <td className="whitespace-nowrap px-2 py-2 text-xs font-medium text-slate-700">Grade {grade}</td>
              {DAY_OPTIONS.map((d) => {
                const selected = dayField.value === d.value;
                return (
                  <td key={d.value} className="p-1 text-center">
                    {selected ? (
                      <input
                        type="time"
                        value={timeField.value}
                        onChange={(e) => timeField.onChange(e.target.value)}
                        disabled={disabled}
                        className={cn(
                          "w-full rounded-md border-0 px-1 py-1 text-center text-[11px] font-medium outline-none",
                          tone.bg,
                          tone.text,
                        )}
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => dayField.onChange(d.value)}
                        className="flex h-7 w-full items-center justify-center rounded-md text-slate-300 hover:bg-slate-50 disabled:pointer-events-none"
                        aria-label={`Set Grade ${grade}'s session to ${d.label}`}
                      >
                        ·
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          )}
        />
      )}
    />
  );
}

function ScheduleGrid({
  grades,
  control,
  disabled,
  hasError,
}: {
  grades: number[];
  control: Control<FormValues>;
  disabled: boolean;
  hasError: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="text-left text-[10px] font-medium uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2">Grade</th>
              {DAY_OPTIONS.map((d) => (
                <th key={d.value} className="px-1 py-2 text-center">
                  {d.label.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grades.map((g, index) => (
              <ScheduleRow key={g} grade={g} index={index} control={control} disabled={disabled} />
            ))}
          </tbody>
        </table>
      </div>
      {hasError && <p className="text-xs text-destructive">Select a day and time for every grade.</p>}
    </div>
  );
}

function buildPayload(values: FormValues) {
  return {
    iif_poc: values.iif_poc,
    teachers: values.teachers.map((t) => ({
      name: t.name,
      phone: t.phone,
      grades_taught: [...t.grades_taught].sort((a, b) => a - b).join(","),
    })),
    session_schedules: values.schedules.map((s) => ({
      grade: s.grade,
      day_of_week: s.day_of_week,
      time: s.time,
    })),
  };
}

export function ContactInfoForm() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";

  const form = useForm<FormValues>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { schoolId, school, locked, picker } = usePartnerSchoolPicker({
    isAdmin,
    submittedField: "form2_submitted",
    submittedBannerTitle: "Already submitted for this school.",
    submittedBannerBody: "Form 2 data has already been submitted for this school.",
    onPartnerChange: () => form.reset(EMPTY_VALUES),
  });

  const submitForm2 = useSubmitForm2(schoolId);

  useEffect(() => {
    if (school) form.reset(schoolToFormValues(school));
  }, [school, form]);

  const {
    fields: teacherFields,
    append: appendTeacher,
    remove: removeTeacher,
  } = useFieldArray({ control: form.control, name: "teachers" });

  const watchedTeachers = useWatch({ control: form.control, name: "teachers" });
  const errors = form.formState.errors;
  const grades = parseGradesOffered(school);
  const form1Missing = !!school && !school.form1_submitted;
  const fieldsDisabled = !schoolId || locked || form1Missing;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submitForm2.mutateAsync(buildPayload(values));
      toast.success("Form 2 submitted.");
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Could not submit.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-24">
      <SectionCard id="who-and-where" icon={MapPin} title="Who & where">
        {picker}

        {form1Missing && (
          <StatusBanner
            title="School Enrollment (Form 1) must be submitted first."
            action={
              <Link href="/dashboard/schools/enrollment" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Go to Form 1
              </Link>
            }
          />
        )}
      </SectionCard>

      <FormStepper schoolId={schoolId} current="form2" />

      {school && !form1Missing && (
        <>
          <SectionCard id="section-prefill" icon={CheckCircle2} title="Prefilled from Form 1">
            <Field label="Google Maps location">
              <Input readOnly value={school.maps_link} className="bg-muted/50" />
            </Field>
            <Field label="Principal">
              <Input readOnly value={`${school.principal_name} · ${school.principal_phone}`} className="bg-muted/50" />
            </Field>
            <Field label="Grades participating">
              <Input readOnly value={grades.map((g) => `Grade ${g}`).join(", ")} className="bg-muted/50" />
            </Field>
          </SectionCard>

          <SectionCard id="section-teachers" icon={Users} title="Teachers">
            <Field label="IIF Point of Contact" required error={errors.iif_poc?.message}>
              <Input {...form.register("iif_poc")} disabled={fieldsDisabled} />
            </Field>

            {teacherFields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeacherAvatar name={watchedTeachers?.[index]?.name ?? ""} />
                    <p className="text-sm font-medium text-slate-700">
                      {watchedTeachers?.[index]?.name || `Teacher ${index + 1}`}
                    </p>
                  </div>
                  {teacherFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={fieldsDisabled}
                      onClick={() => removeTeacher(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <Field label="Name" required error={errors.teachers?.[index]?.name?.message}>
                  <Input {...form.register(`teachers.${index}.name`)} disabled={fieldsDisabled} />
                </Field>
                <Field label="Phone" required error={errors.teachers?.[index]?.phone?.message}>
                  <Input
                    placeholder="10-digit mobile"
                    {...form.register(`teachers.${index}.phone`)}
                    disabled={fieldsDisabled}
                  />
                </Field>
                <Controller
                  control={form.control}
                  name={`teachers.${index}.grades_taught`}
                  render={({ field: gradesField }) => (
                    <Field label="Grades taught" required error={errors.teachers?.[index]?.grades_taught?.message}>
                      <ToggleGroup
                        multiple
                        value={gradesField.value.map(String)}
                        onValueChange={(v: string[]) => gradesField.onChange(v.map(Number).sort((a, b) => a - b))}
                        disabled={fieldsDisabled}
                      >
                        {grades.map((g) => (
                          <ToggleGroupItem key={g} value={String(g)} tone="coral">
                            Grade {g}
                          </ToggleGroupItem>
                        ))}
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
              onClick={() => appendTeacher({ name: "", phone: "", grades_taught: [] })}
            >
              <Plus className="size-4" /> Add another teacher
            </Button>
          </SectionCard>

          <SectionCard id="section-schedule" icon={CalendarDays} title="Weekly session schedule">
            <ScheduleGrid
              grades={grades}
              control={form.control}
              disabled={fieldsDisabled}
              hasError={!!errors.schedules}
            />
          </SectionCard>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            type="submit"
            className="flex-1 bg-brand-coral hover:bg-brand-coral-dark"
            disabled={fieldsDisabled || submitForm2.isPending}
          >
            {submitForm2.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      </div>
    </form>
  );
}
