import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { z } from "zod";

import { ChipMultiselect } from "@/components/chip-multiselect";
import { FormField } from "@/components/form-field";
import { SectionCard } from "@/components/forms/section-card";
import { usePartnerSchoolPicker } from "@/components/forms/use-partner-school-picker";
import { LabeledSelect } from "@/components/labeled-select";
import { ScreenHeader } from "@/components/screen-header";
import { SegmentedField } from "@/components/segmented-field";
import { useSaveEnrollmentDraft, useSubmitForm1, useUploadSchoolPhoto } from "@/features/enrollment/use-enrollment-data";
import { useOpenDrawer } from "@/hooks/use-open-drawer";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { formScreenStyles as fs } from "@/lib/form-screen-styles";
import { colors, spacing } from "@/lib/theme";
import type { School } from "@/lib/types";

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

export default function EnrollmentScreen() {
  const { auth } = useAuth();
  const isAdmin = auth?.user.role === "admin";
  const openDrawer = useOpenDrawer();

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

  const saveDraft = useSaveEnrollmentDraft(schoolId);
  const submitForm1 = useSubmitForm1(schoolId);
  const uploadPhoto = useUploadSchoolPhoto(schoolId);

  useEffect(() => {
    if (school) form.reset(schoolToFormValues(school));
  }, [school, form]);

  const fieldsDisabled = !schoolId || locked;
  const errors = form.formState.errors;
  const grades = form.watch("grades");
  const schoolPhoto = form.watch("school_photo");

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      const uploaded = await uploadPhoto.mutateAsync({ uri: asset.uri, mimeType: asset.mimeType });
      form.setValue("school_photo", uploaded.id);
    } catch {
      Alert.alert("Upload failed", "Could not upload the photo.");
    }
  }

  async function useMyGps() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Location permission needed", "Enable location access, or paste the Maps link instead.");
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({});
      form.setValue("maps_link", `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`, {
        shouldValidate: true,
      });
    } catch {
      Alert.alert("Could not get location", "Paste the Maps link instead.");
    }
  }

  async function handleSaveDraft() {
    try {
      await saveDraft.mutateAsync(buildDraftPayload(form.getValues()));
      Alert.alert("Draft saved");
    } catch (err) {
      Alert.alert("Could not save draft", apiErrorMessage(err));
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submitForm1.mutateAsync(buildSubmitPayload(values));
      Alert.alert("Form 1 submitted");
    } catch (err) {
      Alert.alert("Could not submit", apiErrorMessage(err));
    }
  });

  return (
    <View style={fs.screen}>
      <ScreenHeader eyebrow="THINK & MAKE 2026-27" title="School Enrollment — Form 1" onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={fs.body}>
        <SectionCard badge="Visit" title="Who & where">
          {picker}
          <FormField label="Visited by (IIF staff)" required error={errors.visited_by?.message}>
            <Controller
              control={form.control}
              name="visited_by"
              render={({ field }) => (
                <TextInput
                  editable={!fieldsDisabled}
                  value={field.value}
                  onChangeText={field.onChange}
                  style={[fs.input, fieldsDisabled && fs.inputDisabled]}
                />
              )}
            />
          </FormField>
          <FormField label="Date of visit" required error={errors.visit_date?.message} hint="Format: YYYY-MM-DD">
            <Controller
              control={form.control}
              name="visit_date"
              render={({ field }) => (
                <TextInput
                  editable={!fieldsDisabled}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textFaint}
                  style={[fs.input, fieldsDisabled && fs.inputDisabled]}
                />
              )}
            />
          </FormField>
        </SectionCard>

        <SectionCard badge="A" title="School Location">
          <FormField label="Enter School Location" required error={errors.location?.message}>
            <Controller control={form.control} name="location" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} style={[fs.input, fieldsDisabled && fs.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Enter District" required error={errors.district?.message}>
            <Controller control={form.control} name="district" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} style={[fs.input, fieldsDisabled && fs.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="What's the distance from district to IIF (in km)?" required error={errors.distance_to_iif_km?.message}>
            <Controller control={form.control} name="distance_to_iif_km" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} keyboardType="numeric" style={[fs.input, fieldsDisabled && fs.inputDisabled]} />
            )} />
          </FormField>
        </SectionCard>

        <SectionCard badge="B" title="Principal details">
          <FormField label="Enter Principal — full name" required error={errors.principal_name?.message}>
            <Controller control={form.control} name="principal_name" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} style={[fs.input, fieldsDisabled && fs.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Enter Principal — phone" required error={errors.principal_phone?.message}>
            <Controller control={form.control} name="principal_phone" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" placeholder="10-digit mobile" placeholderTextColor={colors.textFaint} style={[fs.input, fieldsDisabled && fs.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Enter Principal — email" error={errors.principal_email?.message}>
            <Controller control={form.control} name="principal_email" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} placeholder="optional" placeholderTextColor={colors.textFaint} autoCapitalize="none" keyboardType="email-address" style={[fs.input, fieldsDisabled && fs.inputDisabled]} />
            )} />
          </FormField>
        </SectionCard>

        <SectionCard badge="C" title="School program profile">
          <FormField label="Select Gender type" required error={errors.gender_type?.message}>
            <Controller control={form.control} name="gender_type" render={({ field }) => (
              <LabeledSelect placeholder="Select..." value={field.value} onChange={field.onChange} options={GENDER_OPTIONS} disabled={fieldsDisabled} />
            )} />
          </FormField>
          <FormField label="Select School type" required error={errors.school_type?.message}>
            <Controller control={form.control} name="school_type" render={({ field }) => (
              <LabeledSelect placeholder="Select..." value={field.value} onChange={field.onChange} options={SCHOOL_TYPE_OPTIONS} disabled={fieldsDisabled} />
            )} />
          </FormField>
          <FormField label="Select Medium of instruction" required error={errors.medium?.message}>
            <Controller control={form.control} name="medium" render={({ field }) => (
              <LabeledSelect placeholder="Select..." value={field.value} onChange={field.onChange} options={MEDIUM_OPTIONS} disabled={fieldsDisabled} />
            )} />
          </FormField>
          <FormField label="Select the grades participating in this program from this school" required error={errors.grades?.message}>
            <Controller control={form.control} name="grades" render={({ field }) => (
              <ChipMultiselect options={GRADE_OPTIONS} value={field.value} onChange={field.onChange} disabled={fieldsDisabled} />
            )} />
          </FormField>
          <FormField label="All grades together, how many sections do we have from this school?" required>
            <TextInput editable={false} value={String(grades.length)} placeholder="auto-calculated" placeholderTextColor={colors.textFaint} style={[fs.input, fs.inputDisabled]} />
          </FormField>
        </SectionCard>

        <SectionCard badge="D" title="School Infrastructure">
          <FormField label="Does the school have Lab / activity room available?" required error={errors.lab_room?.message}>
            <Controller control={form.control} name="lab_room" render={({ field }) => (
              <SegmentedField options={YES_NO_OPTIONS} value={field.value} onChange={field.onChange} disabled={fieldsDisabled} />
            )} />
          </FormField>
          <FormField label="Does the school have Internet?" required error={errors.internet?.message}>
            <Controller control={form.control} name="internet" render={({ field }) => (
              <LabeledSelect placeholder="Select..." value={field.value} onChange={field.onChange} options={YES_NO_OPTIONS} disabled={fieldsDisabled} />
            )} />
          </FormField>
          <FormField label="Does the school have Smart board / projector?" required error={errors.smart_board?.message}>
            <Controller control={form.control} name="smart_board" render={({ field }) => (
              <SegmentedField options={SMART_BOARD_OPTIONS} value={field.value} onChange={field.onChange} disabled={fieldsDisabled} />
            )} />
          </FormField>
          <FormField label="Does the school have Storage space for MM Kit?" required error={errors.kit_storage?.message}>
            <Controller control={form.control} name="kit_storage" render={({ field }) => (
              <SegmentedField options={YES_NO_OPTIONS} value={field.value} onChange={field.onChange} disabled={fieldsDisabled} />
            )} />
          </FormField>
        </SectionCard>

        <SectionCard badge="H" title="Photos &amp; Gmaps">
          <FormField label="Upload School photo" hint="Optional.">
            <TouchableOpacity
              style={[fs.outlineButton, (fieldsDisabled || uploadPhoto.isPending) && fs.disabled]}
              disabled={fieldsDisabled || uploadPhoto.isPending}
              onPress={pickPhoto}
            >
              {uploadPhoto.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={fs.outlineButtonText}>{schoolPhoto ? "Photo uploaded — change" : "Choose photo"}</Text>
              )}
            </TouchableOpacity>
          </FormField>

          <FormField label="Share School Google Maps location" required error={errors.maps_link?.message}>
            <TouchableOpacity
              style={[fs.outlineButton, fieldsDisabled && fs.disabled]}
              disabled={fieldsDisabled}
              onPress={useMyGps}
            >
              <Text style={fs.outlineButtonText}>📍 Use my GPS</Text>
            </TouchableOpacity>
            <Controller control={form.control} name="maps_link" render={({ field }) => (
              <TextInput
                editable={!fieldsDisabled}
                value={field.value}
                onChangeText={field.onChange}
                placeholder="or paste maps URL"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                style={[fs.input, styles.inputSpaced, fieldsDisabled && fs.inputDisabled]}
              />
            )} />
          </FormField>
        </SectionCard>

        <SectionCard badge="I" title="Notes &amp; sign-off">
          <FormField label="Open observations / concerns">
            <Controller control={form.control} name="observations" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} multiline style={[fs.input, fs.textarea, fieldsDisabled && fs.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Next steps · what's needed from school">
            <Controller control={form.control} name="next_steps" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} multiline style={[fs.input, fs.textarea, fieldsDisabled && fs.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Principal acknowledgement" required error={errors.principal_acknowledged?.message} hint="Principal aware of programme and timing.">
            <Controller control={form.control} name="principal_acknowledged" render={({ field }) => (
              <SegmentedField options={YES_NO_OPTIONS} value={field.value} onChange={field.onChange} disabled={fieldsDisabled} />
            )} />
          </FormField>
        </SectionCard>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={fs.footer}>
        <TouchableOpacity
          style={[fs.footerButton, fs.draftButton, (fieldsDisabled || saveDraft.isPending) && fs.disabled]}
          disabled={fieldsDisabled || saveDraft.isPending}
          onPress={handleSaveDraft}
        >
          {saveDraft.isPending ? <ActivityIndicator size="small" /> : <Text style={fs.draftButtonText}>Save draft</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[fs.footerButton, fs.submitButton, (fieldsDisabled || submitForm1.isPending) && fs.disabled]}
          disabled={fieldsDisabled || submitForm1.isPending}
          onPress={onSubmit}
        >
          {submitForm1.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={fs.submitButtonText}>Submit</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputSpaced: { marginTop: spacing.sm },
});
