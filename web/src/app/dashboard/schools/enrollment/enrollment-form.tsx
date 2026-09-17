"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/forms/field";
import { usePartnerSchoolPicker } from "@/components/forms/partner-school-picker";
import { SectionCard } from "@/components/forms/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiErrorMessage } from "@/lib/api-error";
import type { School } from "@/lib/types";

import { useSaveDraft, useSubmitForm1, useUploadSchoolPhoto } from "./use-enrollment-data";

const REQUIRED = "Required";
const GRADE_OPTIONS = [6, 7, 8, 9];
const GENDER_OPTIONS = [
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" },
  { value: "co-ed", label: "Co-ed" },
];
const SCHOOL_TYPE_OPTIONS = [
  { value: "government", label: "Government" },
  { value: "private", label: "Private" },
  { value: "aided", label: "Aided" },
];
const MEDIUM_OPTIONS = [
  { value: "telugu", label: "Telugu" },
  { value: "english", label: "English" },
  { value: "urdu", label: "Urdu" },
];
const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const SMART_BOARD_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "yes_not_working", label: "Yes but not working" },
];

function enumField(allowed: readonly string[]) {
  return z.string().refine((v) => allowed.includes(v), REQUIRED);
}

const enrollmentSchema = z.object({
  visited_by: z.string().min(1, REQUIRED),
  visit_date: z.string().min(1, REQUIRED),
  location: z.string().min(1, REQUIRED),
  district: z.string().min(1, REQUIRED),
  distance_to_iif_km: z.string().regex(/^\d+(\.\d+)?$/, "Enter a distance in km"),
  principal_name: z.string().min(1, REQUIRED),
  principal_phone: z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile number"),
  principal_email: z.string().refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email"),
  gender_type: enumField(GENDER_OPTIONS.map((o) => o.value)),
  school_type: enumField(SCHOOL_TYPE_OPTIONS.map((o) => o.value)),
  medium: enumField(MEDIUM_OPTIONS.map((o) => o.value)),
  grades: z.array(z.number()).min(1, "Select at least one grade"),
  lab_room: enumField(YES_NO_OPTIONS.map((o) => o.value)),
  internet: enumField(YES_NO_OPTIONS.map((o) => o.value)),
  smart_board: enumField(SMART_BOARD_OPTIONS.map((o) => o.value)),
  kit_storage: enumField(YES_NO_OPTIONS.map((o) => o.value)),
  maps_link: z.string().min(1, "Add a Google Maps location"),
  school_photo: z.number().nullable(),
  observations: z.string(),
  next_steps: z.string(),
  principal_acknowledged: enumField(YES_NO_OPTIONS.map((o) => o.value)),
});

type FormValues = z.infer<typeof enrollmentSchema>;

const EMPTY_VALUES: FormValues = {
  visited_by: "",
  visit_date: new Date().toISOString().slice(0, 10),
  location: "",
  district: "",
  distance_to_iif_km: "",
  principal_name: "",
  principal_phone: "",
  principal_email: "",
  gender_type: "",
  school_type: "",
  medium: "",
  grades: [],
  lab_room: "",
  internet: "",
  smart_board: "",
  kit_storage: "",
  maps_link: "",
  school_photo: null,
  observations: "",
  next_steps: "",
  principal_acknowledged: "",
};

function schoolToFormValues(school: School): FormValues {
  return {
    visited_by: school.visited_by || "",
    visit_date: school.visit_date || new Date().toISOString().slice(0, 10),
    location: school.location || "",
    district: school.district || "",
    distance_to_iif_km: school.distance_to_iif_km ?? "",
    principal_name: school.principal_name || "",
    principal_phone: school.principal_phone || "",
    principal_email: school.principal_email || "",
    gender_type: school.gender_type || "",
    school_type: school.school_type || "",
    medium: school.medium || "",
    grades: school.grades_offered
      ? school.grades_offered.split(",").map(Number).filter((n) => !Number.isNaN(n))
      : [],
    lab_room: school.lab_room === true ? "yes" : school.lab_room === false ? "no" : "",
    internet: school.internet === true ? "yes" : school.internet === false ? "no" : "",
    smart_board: school.smart_board || "",
    kit_storage: school.kit_storage === true ? "yes" : school.kit_storage === false ? "no" : "",
    maps_link: school.maps_link || "",
    school_photo: school.school_photo,
    observations: school.observations || "",
    next_steps: school.next_steps || "",
    principal_acknowledged: school.principal_acknowledged ? "yes" : "no",
  };
}

function toNullableBool(v: string): boolean | null {
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function buildDraftPayload(values: FormValues) {
  return {
    visited_by: values.visited_by,
    visit_date: values.visit_date || null,
    location: values.location,
    district: values.district,
    distance_to_iif_km: values.distance_to_iif_km ? Number(values.distance_to_iif_km) : null,
    principal_name: values.principal_name,
    principal_phone: values.principal_phone,
    principal_email: values.principal_email,
    gender_type: values.gender_type,
    school_type: values.school_type,
    medium: values.medium,
    grades_offered: [...values.grades].sort((a, b) => a - b).join(","),
    total_sections: values.grades.length,
    lab_room: toNullableBool(values.lab_room),
    internet: toNullableBool(values.internet),
    smart_board: values.smart_board,
    kit_storage: toNullableBool(values.kit_storage),
    maps_link: values.maps_link,
    school_photo: values.school_photo,
    observations: values.observations,
    next_steps: values.next_steps,
    principal_acknowledged: values.principal_acknowledged === "yes",
  };
}

function buildSubmitPayload(values: FormValues) {
  return {
    visited_by: values.visited_by,
    visit_date: values.visit_date,
    location: values.location,
    district: values.district,
    distance_to_iif_km: Number(values.distance_to_iif_km),
    principal_name: values.principal_name,
    principal_phone: values.principal_phone,
    principal_email: values.principal_email,
    gender_type: values.gender_type,
    school_type: values.school_type,
    medium: values.medium,
    grades: values.grades,
    lab_room: values.lab_room === "yes",
    internet: values.internet === "yes",
    smart_board: values.smart_board,
    kit_storage: values.kit_storage === "yes",
    maps_link: values.maps_link,
    school_photo: values.school_photo,
    observations: values.observations,
    next_steps: values.next_steps,
    principal_acknowledged: values.principal_acknowledged === "yes",
  };
}

export function EnrollmentForm() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";

  const photoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { schoolId, school, locked, picker } = usePartnerSchoolPicker({
    isAdmin,
    submittedField: "form1_submitted",
    submittedBannerTitle: "Already submitted for this school.",
    submittedBannerBody: "Form 1 data has already been submitted for this school.",
    onPartnerChange: () => form.reset(EMPTY_VALUES),
  });

  const saveDraft = useSaveDraft(schoolId);
  const submitForm1 = useSubmitForm1(schoolId);
  const uploadPhoto = useUploadSchoolPhoto(schoolId);

  useEffect(() => {
    if (school) form.reset(schoolToFormValues(school));
  }, [school, form]);

  const grades = useWatch({ control: form.control, name: "grades" });
  const schoolPhoto = useWatch({ control: form.control, name: "school_photo" });
  const errors = form.formState.errors;

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !schoolId) return;
    try {
      const uploaded = await uploadPhoto.mutateAsync(file);
      form.setValue("school_photo", uploaded.id);
      toast.success("Photo uploaded.");
    } catch {
      toast.error("Could not upload photo.");
    }
  }

  function useMyGps() {
    if (!navigator.geolocation) {
      toast.error("Location isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue(
          "maps_link",
          `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
          { shouldValidate: true },
        );
        toast.success("Location captured.");
      },
      () => toast.error("Could not get location — paste the Maps link instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSaveDraft() {
    if (!schoolId) return;
    try {
      await saveDraft.mutateAsync(buildDraftPayload(form.getValues()));
      toast.success("Draft saved.");
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Could not save draft.");
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submitForm1.mutateAsync(buildSubmitPayload(values));
      toast.success("Form 1 submitted.");
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Could not submit.");
    }
  });

  const fieldsDisabled = !schoolId || locked;

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-24">
      <SectionCard id="who-and-where" badge="Visit" title="Who & where">
        {picker}

        <Field label="Visited by (IIF staff)" required error={errors.visited_by?.message}>
          <Input {...form.register("visited_by")} disabled={fieldsDisabled} />
        </Field>
        <Field label="Date of visit" required error={errors.visit_date?.message}>
          <Input type="date" {...form.register("visit_date")} disabled={fieldsDisabled} />
        </Field>
      </SectionCard>

      <SectionCard id="section-a" badge="A" title="School Location">
        <Field label="Enter School Location" required error={errors.location?.message}>
          <Input {...form.register("location")} disabled={fieldsDisabled} />
        </Field>
        <Field label="Enter District" required error={errors.district?.message}>
          <Input {...form.register("district")} disabled={fieldsDisabled} />
        </Field>
        <Field label="What's the distance from district to IIF (in km)?" required error={errors.distance_to_iif_km?.message}>
          <Input type="number" step="0.1" {...form.register("distance_to_iif_km")} disabled={fieldsDisabled} />
        </Field>
      </SectionCard>

      <SectionCard id="section-b" badge="B" title="Principal details">
        <Field label="Enter Principal — full name" required error={errors.principal_name?.message}>
          <Input {...form.register("principal_name")} disabled={fieldsDisabled} />
        </Field>
        <Field label="Enter Principal — phone" required error={errors.principal_phone?.message}>
          <Input placeholder="10-digit mobile" {...form.register("principal_phone")} disabled={fieldsDisabled} />
        </Field>
        <Field label="Enter Principal — email" error={errors.principal_email?.message}>
          <Input placeholder="optional" {...form.register("principal_email")} disabled={fieldsDisabled} />
        </Field>
      </SectionCard>

      <SectionCard id="section-c" badge="C" title="School program profile">
        <Controller
          control={form.control}
          name="gender_type"
          render={({ field }) => (
            <Field label="Select Gender type" required error={errors.gender_type?.message}>
              <Select
                items={GENDER_OPTIONS}
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "")}
                disabled={fieldsDisabled}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="school_type"
          render={({ field }) => (
            <Field label="Select School type" required error={errors.school_type?.message}>
              <Select
                items={SCHOOL_TYPE_OPTIONS}
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "")}
                disabled={fieldsDisabled}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {SCHOOL_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="medium"
          render={({ field }) => (
            <Field label="Select Medium of instruction" required error={errors.medium?.message}>
              <Select
                items={MEDIUM_OPTIONS}
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "")}
                disabled={fieldsDisabled}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {MEDIUM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="grades"
          render={({ field }) => (
            <Field label="Select the grades participating in this program from this school" required error={errors.grades?.message}>
              <ToggleGroup
                multiple
                value={field.value.map(String)}
                onValueChange={(v: string[]) => field.onChange(v.map(Number).sort((a, b) => a - b))}
                disabled={fieldsDisabled}
              >
                {GRADE_OPTIONS.map((g) => (
                  <ToggleGroupItem key={g} value={String(g)}>
                    Grade {g}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          )}
        />
        <Field label="All grades together, how many sections do we have from this school?" required>
          <Input readOnly value={grades.length} placeholder="auto-calculated" className="bg-muted/50" />
        </Field>
      </SectionCard>

      <SectionCard id="section-d" badge="D" title="School Infrastructure">
        <Controller
          control={form.control}
          name="lab_room"
          render={({ field }) => (
            <Field label="Does the school have Lab / activity room available?" required error={errors.lab_room?.message}>
              <ToggleGroup value={field.value ? [field.value] : []} onValueChange={(v: string[]) => field.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
              </ToggleGroup>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="internet"
          render={({ field }) => (
            <Field label="Does the school have Internet?" required error={errors.internet?.message}>
              <Select
                items={YES_NO_OPTIONS}
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "")}
                disabled={fieldsDisabled}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {YES_NO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="smart_board"
          render={({ field }) => (
            <Field label="Does the school have Smart board / projector?" required error={errors.smart_board?.message}>
              <ToggleGroup value={field.value ? [field.value] : []} onValueChange={(v: string[]) => field.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                {SMART_BOARD_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
              </ToggleGroup>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="kit_storage"
          render={({ field }) => (
            <Field label="Does the school have Storage space for MM Kit?" required error={errors.kit_storage?.message}>
              <ToggleGroup value={field.value ? [field.value] : []} onValueChange={(v: string[]) => field.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
              </ToggleGroup>
            </Field>
          )}
        />
      </SectionCard>

      <SectionCard id="section-h" badge="H" title="Photos & Gmaps">
        <Field label="Upload School photo">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={fieldsDisabled || uploadPhoto.isPending} onClick={() => photoInputRef.current?.click()}>
              {uploadPhoto.isPending ? <Loader2 className="size-4 animate-spin" /> : "Choose File"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {schoolPhoto ? "Photo uploaded" : "No file chosen"}
            </span>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
          <p className="text-xs text-muted-foreground">Optional.</p>
        </Field>

        <Controller
          control={form.control}
          name="maps_link"
          render={({ field }) => (
            <Field label="Share School Google Maps location" required error={errors.maps_link?.message}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" disabled={fieldsDisabled} onClick={useMyGps} className="sm:w-auto">
                  <MapPin className="size-4" /> Use my GPS
                </Button>
                <Input
                  placeholder="or paste maps URL"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={fieldsDisabled}
                />
              </div>
            </Field>
          )}
        />
      </SectionCard>

      <SectionCard id="section-i" badge="I" title="Notes & sign-off">
        <Field label="Open observations / concerns">
          <Textarea {...form.register("observations")} disabled={fieldsDisabled} />
        </Field>
        <Field label="Next steps · what's needed from school">
          <Textarea {...form.register("next_steps")} disabled={fieldsDisabled} />
        </Field>
        <Controller
          control={form.control}
          name="principal_acknowledged"
          render={({ field }) => (
            <Field label="Principal acknowledgement" required error={errors.principal_acknowledged?.message}>
              <p className="text-xs text-muted-foreground -mt-1 mb-1">Principal aware of programme and timing.</p>
              <ToggleGroup value={field.value ? [field.value] : []} onValueChange={(v: string[]) => field.onChange(v[0] ?? "")} disabled={fieldsDisabled}>
                {YES_NO_OPTIONS.map((o) => <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>)}
              </ToggleGroup>
            </Field>
          )}
        />
      </SectionCard>

      <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t bg-white p-3">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={fieldsDisabled || saveDraft.isPending}
            onClick={handleSaveDraft}
          >
            {saveDraft.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save draft"}
          </Button>
          <Button type="submit" className="flex-1 bg-sky-500 hover:bg-sky-600" disabled={fieldsDisabled || submitForm1.isPending}>
            {submitForm1.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      </div>
    </form>
  );
}
