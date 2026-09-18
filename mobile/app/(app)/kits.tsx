import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { z } from "zod";

import { FormField } from "@/components/form-field";
import { SectionCard } from "@/components/forms/section-card";
import { StatusBanner } from "@/components/forms/status-banner";
import { usePartnerSchoolPicker } from "@/components/forms/use-partner-school-picker";
import { ScreenHeader } from "@/components/screen-header";
import { SegmentedField } from "@/components/segmented-field";
import { useKitDeliveryForSchool, useSaveKitDelivery, useUploadKitFile } from "@/features/kits/use-kits-data";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { parseGradesOffered } from "@/lib/grades";
import type { KitDelivery, School } from "@/lib/types";

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

export default function KitsScreen() {
  const { auth } = useAuth();
  const isAdmin = auth?.user.role === "admin";
  const router = useRouter();

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

  const proofPhoto = form.watch("delivery_proof_photo");
  const ackLetter = form.watch("acknowledgement_letter");

  async function pickFile(field: "delivery_proof_photo" | "acknowledgement_letter", entityType: string) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      const uploaded = await uploadFile.mutateAsync({ uri: asset.uri, mimeType: asset.mimeType, entityType });
      form.setValue(field, uploaded.id);
    } catch {
      Alert.alert("Upload failed", "Could not upload the photo.");
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await saveDelivery.mutateAsync(buildPayload(values));
      Alert.alert("Form 5 submitted");
    } catch (err) {
      Alert.alert("Could not submit", apiErrorMessage(err));
    }
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="THINK & MAKE 2026-27" title="Kits Handover Info — Form 5" showBack />
      <ScrollView contentContainerStyle={styles.body}>
        <SectionCard badge="Visit" title="Who & where">
          {picker}
          {form1Missing && (
            <StatusBanner
              title="School Enrollment (Form 1) must be submitted first."
              action={
                <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/(app)/schools/enrollment")}>
                  <Text style={styles.linkButtonText}>Go to Form 1</Text>
                </TouchableOpacity>
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

        {school && !form1Missing && (
          <>
            <SectionCard badge="A" title="Delivery details">
              <FormField label="Delivered by" required error={errors.delivered_by?.message}>
                <Controller
                  control={form.control}
                  name="delivered_by"
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
              <FormField label="Received by (name & designation)" required error={errors.received_by?.message}>
                <Controller
                  control={form.control}
                  name="received_by"
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
              <FormField label="Date of delivery" required error={errors.date_of_delivery?.message} hint="Format: YYYY-MM-DD">
                <Controller
                  control={form.control}
                  name="date_of_delivery"
                  render={({ field }) => (
                    <TextInput
                      editable={!fieldsDisabled}
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                    />
                  )}
                />
              </FormField>

              {grades.map((g, index) => (
                <Controller
                  key={g}
                  control={form.control}
                  name={`grade_kits.${index}.delivered`}
                  render={({ field }) => (
                    <FormField
                      label={`Grade ${g} — MM Kit delivered?`}
                      required
                      error={errors.grade_kits?.[index]?.delivered?.message}
                    >
                      <SegmentedField
                        options={YES_NO_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={fieldsDisabled}
                      />
                    </FormField>
                  )}
                />
              ))}
            </SectionCard>

            <SectionCard badge="B" title="Photos">
              <FormField label="Delivery proof photo" hint="Optional.">
                <TouchableOpacity
                  style={[styles.outlineButton, (fieldsDisabled || uploadFile.isPending) && styles.disabled]}
                  disabled={fieldsDisabled || uploadFile.isPending}
                  onPress={() => pickFile("delivery_proof_photo", "kit_delivery_proof")}
                >
                  {uploadFile.isPending ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text style={styles.outlineButtonText}>{proofPhoto ? "Photo uploaded — change" : "Choose File"}</Text>
                  )}
                </TouchableOpacity>
              </FormField>

              <FormField label="Acknowledgement letter photo (signed by HM & Teacher)" hint="Optional.">
                <TouchableOpacity
                  style={[styles.outlineButton, (fieldsDisabled || uploadFile.isPending) && styles.disabled]}
                  disabled={fieldsDisabled || uploadFile.isPending}
                  onPress={() => pickFile("acknowledgement_letter", "kit_acknowledgement_letter")}
                >
                  {uploadFile.isPending ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text style={styles.outlineButtonText}>{ackLetter ? "Photo uploaded — change" : "Choose File"}</Text>
                  )}
                </TouchableOpacity>
              </FormField>
            </SectionCard>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.submitButton, (fieldsDisabled || saveDelivery.isPending) && styles.disabled]}
          disabled={fieldsDisabled || saveDelivery.isPending}
          onPress={onSubmit}
        >
          {saveDelivery.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  body: { padding: 16, gap: 12 },
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
  outlineButton: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  outlineButtonText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  disabled: { opacity: 0.4 },
  linkButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkButtonText: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  footer: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0", backgroundColor: "#fff" },
  footerButton: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  submitButton: { backgroundColor: "#0ea5e9" },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
