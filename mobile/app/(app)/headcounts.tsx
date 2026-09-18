import { zodResolver } from "@hookform/resolvers/zod";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { z } from "zod";

import { FormField } from "@/components/form-field";
import { SectionCard } from "@/components/forms/section-card";
import { StatusBanner } from "@/components/forms/status-banner";
import { usePartnerSchoolPicker } from "@/components/forms/use-partner-school-picker";
import { ScreenHeader } from "@/components/screen-header";
import { SegmentedField } from "@/components/segmented-field";
import { useCreateHeadcount, useHeadcountsForSchool, useUploadHeadcountFile } from "@/features/headcounts/use-headcounts-data";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { parseGradesOffered } from "@/lib/grades";

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

export default function HeadcountsScreen() {
  const router = useRouter();
  const { auth } = useAuth();
  const isAdmin = auth?.user.role === "admin";

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

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "image/*",
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      const uploaded = await uploadFile.mutateAsync({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      form.setValue("teams_info_photo", uploaded.id);
    } catch {
      Alert.alert("Upload failed", "Could not upload the file.");
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createHeadcount.mutateAsync(buildPayload(values));
      Alert.alert("Entry added");
      form.reset({ ...EMPTY_VALUES, grade: values.grade });
    } catch (err) {
      Alert.alert("Could not add entry", apiErrorMessage(err));
    }
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="THINK & MAKE 2026-27" title="Students Count Info — Form 3" showBack />
      <ScrollView contentContainerStyle={styles.body}>
        <SectionCard badge="Visit" title="Who & where">
          {picker}
          {form2Missing && (
            <StatusBanner
              title="Schools Contact Info (Form 2) must be submitted first."
              action={
                <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/(app)/schools/contact-info")}>
                  <Text style={styles.linkButtonText}>Go to Form 2</Text>
                </TouchableOpacity>
              }
            />
          )}
        </SectionCard>

        {school && !form2Missing && entries.length > 0 && (
          <SectionCard badge="✓" title="Entries so far">
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entryRow}>
                <Text style={styles.entryText}>
                  Grade {entry.grade} — Section {entry.section}
                </Text>
                <Text style={styles.entryMuted}>{entry.total_students} students</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {school && !form2Missing && (
          <SectionCard badge="A" title="New entry">
            <FormField label="Grade" required error={errors.grade?.message}>
              <Controller
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <SegmentedField
                    options={grades.map((g) => ({ value: String(g), label: `Grade ${g}` }))}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={fieldsDisabled}
                  />
                )}
              />
            </FormField>

            <FormField label="Section" required error={errors.section?.message}>
              <Controller
                control={form.control}
                name="section"
                render={({ field }) => (
                  <TextInput
                    editable={!fieldsDisabled}
                    value={field.value}
                    onChangeText={(v) => field.onChange(v.toUpperCase())}
                    placeholder="e.g. A"
                    placeholderTextColor="#94a3b8"
                    style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                  />
                )}
              />
            </FormField>

            <FormField label="Total SL" required error={errors.total_sl?.message}>
              <Controller
                control={form.control}
                name="total_sl"
                render={({ field }) => (
                  <TextInput
                    editable={!fieldsDisabled}
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="numeric"
                    style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                  />
                )}
              />
            </FormField>
            <FormField label="Total Clusters" required error={errors.total_clusters?.message}>
              <Controller
                control={form.control}
                name="total_clusters"
                render={({ field }) => (
                  <TextInput
                    editable={!fieldsDisabled}
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="numeric"
                    style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                  />
                )}
              />
            </FormField>
            <FormField label="Total Teams" required error={errors.total_teams?.message}>
              <Controller
                control={form.control}
                name="total_teams"
                render={({ field }) => (
                  <TextInput
                    editable={!fieldsDisabled}
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="numeric"
                    style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                  />
                )}
              />
            </FormField>
            <FormField label="Total Students" required error={errors.total_students?.message}>
              <Controller
                control={form.control}
                name="total_students"
                render={({ field }) => (
                  <TextInput
                    editable={!fieldsDisabled}
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="numeric"
                    style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                  />
                )}
              />
            </FormField>

            <FormField label="Team IDs Photo" hint="Optional. Image, PDF, or spreadsheet.">
              <TouchableOpacity
                style={[styles.outlineButton, (fieldsDisabled || uploadFile.isPending) && styles.disabled]}
                disabled={fieldsDisabled || uploadFile.isPending}
                onPress={pickFile}
              >
                {uploadFile.isPending ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={styles.outlineButtonText}>{photo ? "File uploaded — change" : "Choose File"}</Text>
                )}
              </TouchableOpacity>
            </FormField>
          </SectionCard>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.footerButton,
            styles.submitButton,
            (fieldsDisabled || createHeadcount.isPending || !selectedGrade) && styles.disabled,
          ]}
          disabled={fieldsDisabled || createHeadcount.isPending || !selectedGrade}
          onPress={onSubmit}
        >
          {createHeadcount.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Entry</Text>
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
  entryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  entryText: { fontSize: 13, color: "#334155" },
  entryMuted: { fontSize: 12, color: "#94a3b8" },
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
