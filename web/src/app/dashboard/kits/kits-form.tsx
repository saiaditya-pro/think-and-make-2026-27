"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, MapPin, Package } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import type { KitDelivery, School } from "@/lib/types";

import { useKitDeliveryForSchool, useSaveKitDelivery, useUploadKitFile } from "./use-kits-data";

const REQUIRED = "Required";
const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function enumField(allowed: readonly string[]) {
  return z.string().refine((v) => allowed.includes(v), REQUIRED);
}

const gradeKitSchema = z.object({
  grade: z.number(),
  delivered: enumField(YES_NO_OPTIONS.map((o) => o.value)),
});

const kitsSchema = z.object({
  delivered_by: z.string().min(1, REQUIRED),
  received_by: z.string().min(1, REQUIRED),
  date_of_delivery: z.string().min(1, REQUIRED),
  grade_kits: z.array(gradeKitSchema),
  delivery_proof_photo: z.number().nullable(),
  acknowledgement_letter: z.number().nullable(),
});

type FormValues = z.infer<typeof kitsSchema>;

const EMPTY_VALUES: FormValues = {
  delivered_by: "",
  received_by: "",
  date_of_delivery: new Date().toISOString().slice(0, 10),
  grade_kits: [],
  delivery_proof_photo: null,
  acknowledgement_letter: null,
};

function gradeKitField(grade: number): keyof KitDelivery {
  return `grade_${grade}_kit` as keyof KitDelivery;
}

function toFormValues(school: School, existing?: KitDelivery): FormValues {
  const grades = parseGradesOffered(school);
  return {
    delivered_by: existing?.delivered_by || "",
    received_by: existing?.received_by || "",
    date_of_delivery: existing?.date_of_delivery || new Date().toISOString().slice(0, 10),
    grade_kits: grades.map((grade) => {
      const delivered = existing ? Boolean(existing[gradeKitField(grade)]) : undefined;
      return { grade, delivered: delivered === true ? "yes" : delivered === false ? "no" : "" };
    }),
    delivery_proof_photo: existing?.delivery_proof_photo ?? null,
    acknowledgement_letter: existing?.acknowledgement_letter ?? null,
  };
}

function buildPayload(values: FormValues) {
  const payload: Record<string, unknown> = {
    delivered_by: values.delivered_by,
    received_by: values.received_by,
    date_of_delivery: values.date_of_delivery,
    delivery_proof_photo: values.delivery_proof_photo,
    acknowledgement_letter: values.acknowledgement_letter,
  };
  for (const { grade, delivered } of values.grade_kits) {
    payload[gradeKitField(grade)] = delivered === "yes";
  }
  return payload;
}

export function KitsForm() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";

  const proofInputRef = useRef<HTMLInputElement>(null);
  const ackInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(kitsSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { schoolId, school, picker } = usePartnerSchoolPicker({
    isAdmin,
    onPartnerChange: () => form.reset(EMPTY_VALUES),
  });

  const kitQuery = useKitDeliveryForSchool(schoolId);
  const existing = kitQuery.data?.results[0];
  const saveDelivery = useSaveKitDelivery(schoolId, existing?.id);
  const uploadFile = useUploadKitFile(schoolId);

  useEffect(() => {
    if (school) form.reset(toFormValues(school, existing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school, existing?.id, form]);

  const grades = parseGradesOffered(school);
  const form1Missing = !!school && !school.form1_submitted;
  const alreadySubmitted = !!existing;
  const locked = alreadySubmitted && !isAdmin;
  const fieldsDisabled = !schoolId || locked || form1Missing;
  const errors = form.formState.errors;

  const proofPhoto = useWatch({ control: form.control, name: "delivery_proof_photo" });
  const ackLetter = useWatch({ control: form.control, name: "acknowledgement_letter" });

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "delivery_proof_photo" | "acknowledgement_letter",
    entityType: string,
  ) {
    const file = e.target.files?.[0];
    if (!file || !schoolId) return;
    try {
      const uploaded = await uploadFile.mutateAsync({ file, entityType });
      form.setValue(field, uploaded.id);
      toast.success("Photo uploaded.");
    } catch {
      toast.error("Could not upload photo.");
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await saveDelivery.mutateAsync(buildPayload(values));
      toast.success("Form 5 submitted.");
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

        {alreadySubmitted && !form1Missing && (
          <StatusBanner
            title="Already submitted for this school."
            body={`Kit handover has already been recorded for this school. ${
              isAdmin ? "You can edit it as an admin." : "Please contact admin to make any changes."
            }`}
          />
        )}
      </SectionCard>

      <FormStepper schoolId={schoolId} current="form5" />

      {school && !form1Missing && (
        <>
          <SectionCard id="section-delivery" icon={Package} title="Delivery details">
            <Field label="Delivered by" required error={errors.delivered_by?.message}>
              <Input {...form.register("delivered_by")} disabled={fieldsDisabled} />
            </Field>
            <Field label="Received by (name & designation)" required error={errors.received_by?.message}>
              <Input {...form.register("received_by")} disabled={fieldsDisabled} />
            </Field>
            <Field label="Date of delivery" required error={errors.date_of_delivery?.message}>
              <Input type="date" {...form.register("date_of_delivery")} disabled={fieldsDisabled} />
            </Field>

            {grades.map((g, index) => (
              <Controller
                key={g}
                control={form.control}
                name={`grade_kits.${index}.delivered`}
                render={({ field }) => (
                  <Field
                    label={`Grade ${g} — MM Kit delivered?`}
                    required
                    error={errors.grade_kits?.[index]?.delivered?.message}
                  >
                    <ToggleGroup
                      value={field.value ? [field.value] : []}
                      onValueChange={(v: string[]) => field.onChange(v[0] ?? "")}
                      disabled={fieldsDisabled}
                    >
                      {YES_NO_OPTIONS.map((o) => (
                        <ToggleGroupItem key={o.value} value={o.value}>
                          {o.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                )}
              />
            ))}
          </SectionCard>

          <SectionCard id="section-photos" icon={Camera} title="Photos">
            <Field label="Delivery proof photo">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={fieldsDisabled || uploadFile.isPending}
                  onClick={() => proofInputRef.current?.click()}
                >
                  {uploadFile.isPending ? <Loader2 className="size-4 animate-spin" /> : "Choose File"}
                </Button>
                <span className="text-xs text-muted-foreground">{proofPhoto ? "Photo uploaded" : "No file chosen"}</span>
              </div>
              <input
                ref={proofInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFileChange(e, "delivery_proof_photo", "kit_delivery_proof")}
              />
              <p className="text-xs text-muted-foreground">Optional.</p>
            </Field>

            <Field label="Acknowledgement letter photo (signed by HM & Teacher)">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={fieldsDisabled || uploadFile.isPending}
                  onClick={() => ackInputRef.current?.click()}
                >
                  {uploadFile.isPending ? <Loader2 className="size-4 animate-spin" /> : "Choose File"}
                </Button>
                <span className="text-xs text-muted-foreground">{ackLetter ? "Photo uploaded" : "No file chosen"}</span>
              </div>
              <input
                ref={ackInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFileChange(e, "acknowledgement_letter", "kit_acknowledgement_letter")}
              />
              <p className="text-xs text-muted-foreground">Optional.</p>
            </Field>
          </SectionCard>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            type="submit"
            className="flex-1 bg-brand-coral hover:bg-brand-coral-dark"
            disabled={fieldsDisabled || saveDelivery.isPending}
          >
            {saveDelivery.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      </div>
    </form>
  );
}
