"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/forms/field";
import { usePartnerSchoolPicker } from "@/components/forms/partner-school-picker";
import { SectionCard } from "@/components/forms/section-card";
import { StatusBanner } from "@/components/forms/status-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiErrorMessage } from "@/lib/api-error";
import { parseGradesOffered } from "@/lib/grades";

import { useCreateHeadcount, useHeadcountsForSchool, useUploadHeadcountFile } from "./use-headcounts-data";

const REQUIRED = "Required";
const NUMBER_MESSAGE = "Enter a number";

const headcountSchema = z.object({
  grade: z.string().min(1, "Select a grade"),
  section: z.string().min(1, REQUIRED).max(5, "Max 5 characters"),
  total_sl: z.string().regex(/^\d+$/, NUMBER_MESSAGE),
  total_clusters: z.string().regex(/^\d+$/, NUMBER_MESSAGE),
  total_teams: z.string().regex(/^\d+$/, NUMBER_MESSAGE),
  total_students: z
    .string()
    .regex(/^\d+$/, NUMBER_MESSAGE)
    .refine((v) => Number(v) >= 1, "Must be at least 1"),
  teams_info_photo: z.number().nullable(),
});

type FormValues = z.infer<typeof headcountSchema>;

const EMPTY_VALUES: FormValues = {
  grade: "",
  section: "",
  total_sl: "",
  total_clusters: "",
  total_teams: "",
  total_students: "",
  teams_info_photo: null,
};

function buildPayload(values: FormValues) {
  return {
    grade: Number(values.grade),
    section: values.section.toUpperCase(),
    total_sl: Number(values.total_sl),
    total_clusters: Number(values.total_clusters),
    total_teams: Number(values.total_teams),
    total_students: Number(values.total_students),
    teams_info_photo: values.teams_info_photo,
  };
}

export function HeadcountsForm() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(headcountSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { schoolId, school, picker } = usePartnerSchoolPicker({
    isAdmin,
    onPartnerChange: () => form.reset(EMPTY_VALUES),
  });

  useEffect(() => {
    form.reset(EMPTY_VALUES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const headcountsQuery = useHeadcountsForSchool(schoolId);
  const entries = headcountsQuery.data?.results ?? [];
  const createHeadcount = useCreateHeadcount(schoolId);
  const uploadFile = useUploadHeadcountFile(schoolId);

  const grades = parseGradesOffered(school);
  const form2Missing = !!school && !school.form2_submitted;
  const fieldsDisabled = !schoolId || form2Missing;
  const errors = form.formState.errors;
  const photo = useWatch({ control: form.control, name: "teams_info_photo" });
  const selectedGrade = useWatch({ control: form.control, name: "grade" });

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !schoolId) return;
    try {
      const uploaded = await uploadFile.mutateAsync(file);
      form.setValue("teams_info_photo", uploaded.id);
      toast.success("Photo uploaded.");
    } catch {
      toast.error("Could not upload photo.");
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createHeadcount.mutateAsync(buildPayload(values));
      toast.success("Entry added.");
      form.reset({ ...EMPTY_VALUES, grade: values.grade });
      setPhotoInputKey((k) => k + 1);
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Could not add entry.");
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

      {school && !form2Missing && entries.length > 0 && (
        <SectionCard id="section-tracker" badge="✓" title="Entries so far">
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  Grade {entry.grade} — Section {entry.section}
                </span>
                <span className="text-muted-foreground">{entry.total_students} students</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {school && !form2Missing && (
        <SectionCard id="section-entry" badge="A" title="New entry">
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

          <Controller
            control={form.control}
            name="section"
            render={({ field }) => (
              <Field label="Section" required error={errors.section?.message}>
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  placeholder="e.g. A"
                  disabled={fieldsDisabled}
                />
              </Field>
            )}
          />

          <Field label="Total SL" required error={errors.total_sl?.message}>
            <Input type="number" min={0} {...form.register("total_sl")} disabled={fieldsDisabled} />
          </Field>
          <Field label="Total Clusters" required error={errors.total_clusters?.message}>
            <Input type="number" min={0} {...form.register("total_clusters")} disabled={fieldsDisabled} />
          </Field>
          <Field label="Total Teams" required error={errors.total_teams?.message}>
            <Input type="number" min={0} {...form.register("total_teams")} disabled={fieldsDisabled} />
          </Field>
          <Field label="Total Students" required error={errors.total_students?.message}>
            <Input type="number" min={1} {...form.register("total_students")} disabled={fieldsDisabled} />
          </Field>

          <Field label="Team IDs Photo">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fieldsDisabled || uploadFile.isPending}
                onClick={() => photoInputRef.current?.click()}
              >
                {uploadFile.isPending ? <Loader2 className="size-4 animate-spin" /> : "Choose File"}
              </Button>
              <span className="text-xs text-muted-foreground">{photo ? "Photo uploaded" : "No file chosen"}</span>
            </div>
            <input
              key={photoInputKey}
              ref={photoInputRef}
              type="file"
              accept="image/*,.pdf,.xlsx,.xls,.csv"
              hidden
              onChange={handlePhotoChange}
            />
            <p className="text-xs text-muted-foreground">Optional.</p>
          </Field>
        </SectionCard>
      )}

      <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            type="submit"
            className="flex-1 bg-sky-500 hover:bg-sky-600"
            disabled={fieldsDisabled || createHeadcount.isPending || !selectedGrade}
          >
            {createHeadcount.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add Entry"}
          </Button>
        </div>
      </div>
    </form>
  );
}
