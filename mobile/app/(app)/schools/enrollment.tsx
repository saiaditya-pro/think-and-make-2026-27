import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

import { ChipMultiselect } from "@/components/chip-multiselect";
import { FormField } from "@/components/form-field";
import { LabeledSelect } from "@/components/labeled-select";
import { ScreenHeader } from "@/components/screen-header";
import { SegmentedField } from "@/components/segmented-field";
import { useAuth } from "@/lib/auth-context";
import type { Paginated, Partner, School } from "@/lib/types";

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

async function readError(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json();
    if (Array.isArray(body) && body.length) return String(body[0]);
    if (body && typeof body === "object" && "detail" in body) return String(body.detail);
  } catch {
    // ignore
  }
  return undefined;
}

export default function EnrollmentScreen() {
  const { auth, authFetch } = useAuth();
  const isAdmin = auth?.user.role === "admin";
  const queryClient = useQueryClient();

  const [partnerId, setPartnerId] = useState("");
  const [schoolId, setSchoolId] = useState("");

  const partnersQuery = useQuery({
    queryKey: ["partners"],
    queryFn: async () => (await authFetch("/partners/")).json() as Promise<Paginated<Partner>>,
  });

  const schoolsQuery = useQuery({
    queryKey: ["schools", "by-partner", partnerId],
    queryFn: async () =>
      (await authFetch(`/schools/?instance__partner=${partnerId}`)).json() as Promise<Paginated<School>>,
    enabled: !!partnerId,
  });

  const schoolDetailQuery = useQuery({
    queryKey: ["schools", "detail", schoolId],
    queryFn: async () => (await authFetch(`/schools/${schoolId}/`)).json() as Promise<School>,
    enabled: !!schoolId,
  });

  const school = schoolDetailQuery.data;

  const saveDraft = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await authFetch(`/schools/${schoolId}/`, { method: "PATCH", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await readError(res)) ?? "Could not save draft.");
      return (await res.json()) as School;
    },
    onSuccess: (data) => queryClient.setQueryData(["schools", "detail", schoolId], data),
  });

  const submitForm1 = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await authFetch(`/schools/${schoolId}/submit-form1/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await readError(res)) ?? "Could not submit.");
      return (await res.json()) as School;
    },
    onSuccess: (data) => queryClient.setQueryData(["schools", "detail", schoolId], data),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (asset: { uri: string; mimeType?: string }) => {
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: "school-photo.jpg", type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
      form.append("entity_type", "school_photo");
      form.append("entity_id", schoolId);
      const res = await authFetch("/files/", { method: "POST", body: form });
      if (!res.ok) throw new Error("Could not upload photo.");
      return (await res.json()) as { id: number };
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (school) form.reset(schoolToFormValues(school));
  }, [school, form]);

  const alreadySubmitted = !!school?.form1_submitted;
  const locked = alreadySubmitted && !isAdmin;
  const fieldsDisabled = !schoolId || locked;
  const errors = form.formState.errors;
  const grades = form.watch("grades");
  const schoolPhoto = form.watch("school_photo");

  function handlePartnerChange(value: string) {
    setPartnerId(value);
    setSchoolId("");
    form.reset(EMPTY_VALUES);
  }

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
      Alert.alert("Could not save draft", err instanceof Error ? err.message : undefined);
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submitForm1.mutateAsync(buildSubmitPayload(values));
      Alert.alert("Form 1 submitted");
    } catch (err) {
      Alert.alert("Could not submit", err instanceof Error ? err.message : undefined);
    }
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="THINK & MAKE 2026-27" title="School Enrollment — Form 1" showBack />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <FormField label="Select Partner" required>
            <LabeledSelect
              placeholder="Select..."
              value={partnerId}
              onChange={handlePartnerChange}
              options={(partnersQuery.data?.results ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
            />
          </FormField>

          <FormField label="Select School" required hint="Schools load from the roster and filter by partner.">
            <LabeledSelect
              placeholder={partnerId ? "Select..." : "Select partner first..."}
              value={schoolId}
              onChange={setSchoolId}
              disabled={!partnerId}
              options={(schoolsQuery.data?.results ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
            />
          </FormField>

          <FormField label="School Code">
            <TextInput
              editable={false}
              value={school?.school_code ?? ""}
              placeholder="auto-filled"
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.inputDisabled]}
            />
          </FormField>

          {schoolDetailQuery.isFetching && (
            <View style={styles.row}>
              <ActivityIndicator size="small" />
              <Text style={styles.hintInline}>Checking school data...</Text>
            </View>
          )}

          {alreadySubmitted && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                ⚠ Already submitted for this school. Form 1 data has already been submitted for this school.{" "}
                {isAdmin ? "You can edit it as an admin." : "Please contact admin to make any changes."}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <FormField label="Visited by (IIF staff)" required error={errors.visited_by?.message}>
            <Controller
              control={form.control}
              name="visited_by"
              render={({ field }) => (
                <TextInput
                  editable={!fieldsDisabled}
                  value={field.value}
                  onChangeText={field.onChange}
                  style={[styles.input, fieldsDisabled && styles.inputDisabled]}
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
                  style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                />
              )}
            />
          </FormField>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>A. School Location</Text>
          <FormField label="Enter School Location" required error={errors.location?.message}>
            <Controller control={form.control} name="location" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} style={[styles.input, fieldsDisabled && styles.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Enter District" required error={errors.district?.message}>
            <Controller control={form.control} name="district" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} style={[styles.input, fieldsDisabled && styles.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="What's the distance from district to IIF (in km)?" required error={errors.distance_to_iif_km?.message}>
            <Controller control={form.control} name="distance_to_iif_km" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} keyboardType="numeric" style={[styles.input, fieldsDisabled && styles.inputDisabled]} />
            )} />
          </FormField>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>B. Principal details</Text>
          <FormField label="Enter Principal — full name" required error={errors.principal_name?.message}>
            <Controller control={form.control} name="principal_name" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} style={[styles.input, fieldsDisabled && styles.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Enter Principal — phone" required error={errors.principal_phone?.message}>
            <Controller control={form.control} name="principal_phone" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" placeholder="10-digit mobile" placeholderTextColor="#94a3b8" style={[styles.input, fieldsDisabled && styles.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Enter Principal — email" error={errors.principal_email?.message}>
            <Controller control={form.control} name="principal_email" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} placeholder="optional" placeholderTextColor="#94a3b8" autoCapitalize="none" keyboardType="email-address" style={[styles.input, fieldsDisabled && styles.inputDisabled]} />
            )} />
          </FormField>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>C. School program profile</Text>
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
            <TextInput editable={false} value={String(grades.length)} placeholder="auto-calculated" placeholderTextColor="#94a3b8" style={[styles.input, styles.inputDisabled]} />
          </FormField>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>D. School Infrastructure</Text>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>H. Photos &amp; Gmaps</Text>
          <FormField label="Upload School photo" hint="Optional.">
            <TouchableOpacity
              style={[styles.outlineButton, (fieldsDisabled || uploadPhoto.isPending) && styles.disabled]}
              disabled={fieldsDisabled || uploadPhoto.isPending}
              onPress={pickPhoto}
            >
              {uploadPhoto.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.outlineButtonText}>{schoolPhoto ? "Photo uploaded — change" : "Choose photo"}</Text>
              )}
            </TouchableOpacity>
          </FormField>

          <FormField label="Share School Google Maps location" required error={errors.maps_link?.message}>
            <TouchableOpacity
              style={[styles.outlineButton, fieldsDisabled && styles.disabled]}
              disabled={fieldsDisabled}
              onPress={useMyGps}
            >
              <Text style={styles.outlineButtonText}>📍 Use my GPS</Text>
            </TouchableOpacity>
            <Controller control={form.control} name="maps_link" render={({ field }) => (
              <TextInput
                editable={!fieldsDisabled}
                value={field.value}
                onChangeText={field.onChange}
                placeholder="or paste maps URL"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                style={[styles.input, styles.inputSpaced, fieldsDisabled && styles.inputDisabled]}
              />
            )} />
          </FormField>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>I. Notes &amp; sign-off</Text>
          <FormField label="Open observations / concerns">
            <Controller control={form.control} name="observations" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} multiline style={[styles.input, styles.textarea, fieldsDisabled && styles.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Next steps · what's needed from school">
            <Controller control={form.control} name="next_steps" render={({ field }) => (
              <TextInput editable={!fieldsDisabled} value={field.value} onChangeText={field.onChange} multiline style={[styles.input, styles.textarea, fieldsDisabled && styles.inputDisabled]} />
            )} />
          </FormField>
          <FormField label="Principal acknowledgement" required error={errors.principal_acknowledged?.message} hint="Principal aware of programme and timing.">
            <Controller control={form.control} name="principal_acknowledged" render={({ field }) => (
              <SegmentedField options={YES_NO_OPTIONS} value={field.value} onChange={field.onChange} disabled={fieldsDisabled} />
            )} />
          </FormField>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.draftButton, (fieldsDisabled || saveDraft.isPending) && styles.disabled]}
          disabled={fieldsDisabled || saveDraft.isPending}
          onPress={handleSaveDraft}
        >
          {saveDraft.isPending ? <ActivityIndicator size="small" /> : <Text style={styles.draftButtonText}>Save draft</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, styles.submitButton, (fieldsDisabled || submitForm1.isPending) && styles.disabled]}
          disabled={fieldsDisabled || submitForm1.isPending}
          onPress={onSubmit}
        >
          {submitForm1.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  body: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  inputDisabled: { backgroundColor: "#f1f5f9", color: "#94a3b8" },
  inputSpaced: { marginTop: 8 },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintInline: { fontSize: 12, color: "#64748b" },
  banner: { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fcd34d", borderRadius: 10, padding: 12 },
  bannerText: { fontSize: 13, color: "#92400e" },
  outlineButton: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  outlineButtonText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  disabled: { opacity: 0.4 },
  footer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  footerButton: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  draftButton: { backgroundColor: "#f1f5f9" },
  draftButtonText: { color: "#334155", fontWeight: "700", fontSize: 14 },
  submitButton: { backgroundColor: "#0ea5e9" },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
