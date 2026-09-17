"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
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
import type { School } from "@/lib/types";

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
      <SectionCard id="who-and-where" badge="Visit" title="Who & where">
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

      {school && !form1Missing && (
        <>
          <SectionCard id="section-prefill" badge="1" title="Prefilled from Form 1">
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

          <SectionCard id="section-teachers" badge="2" title="Teachers">
            <Field label="IIF Point of Contact" required error={errors.iif_poc?.message}>
              <Input {...form.register("iif_poc")} disabled={fieldsDisabled} />
            </Field>

            {teacherFields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Teacher {index + 1}</p>
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
                          <ToggleGroupItem key={g} value={String(g)}>
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

          <SectionCard id="section-schedule" badge="3" title="Session schedule">
            {grades.map((g, index) => (
              <div key={g} className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium text-slate-700">Grade {g}</p>
                <Controller
                  control={form.control}
                  name={`schedules.${index}.day_of_week`}
                  render={({ field }) => (
                    <Field label="Day" required error={errors.schedules?.[index]?.day_of_week?.message}>
                      <Select
                        items={DAY_OPTIONS}
                        value={field.value}
                        onValueChange={(v) => field.onChange(v ?? "")}
                        disabled={fieldsDisabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Field label="Time" required error={errors.schedules?.[index]?.time?.message}>
                  <Input type="time" {...form.register(`schedules.${index}.time`)} disabled={fieldsDisabled} />
                </Field>
              </div>
            ))}
          </SectionCard>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            type="submit"
            className="flex-1 bg-sky-500 hover:bg-sky-600"
            disabled={fieldsDisabled || submitForm2.isPending}
          >
            {submitForm2.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      </div>
    </form>
  );
}
