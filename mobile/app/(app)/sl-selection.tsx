import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { z } from "zod";

import { FormField } from "@/components/form-field";
import { SectionCard } from "@/components/forms/section-card";
import { StatusBanner } from "@/components/forms/status-banner";
import { usePartnerSchoolPicker } from "@/components/forms/use-partner-school-picker";
import { LabeledSelect } from "@/components/labeled-select";
import { ScreenHeader } from "@/components/screen-header";
import { SegmentedField } from "@/components/segmented-field";
import { useBulkSubmitSLSelections, useSLSelectionsForGradeSection } from "@/features/sl-selection/use-sl-selection-data";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { parseGradesOffered } from "@/lib/grades";

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

export default function SLSelectionScreen() {
  const { auth } = useAuth();
  const isAdmin = auth?.user.role === "admin";
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(slSelectionSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { schoolId, school, picker } = usePartnerSchoolPicker({
    isAdmin,
    onPartnerChange: () => form.reset(EMPTY_VALUES),
  });

  const {
    fields: slFields,
    append: appendSl,
    remove: removeSl,
  } = useFieldArray({ control: form.control, name: "sls" });

  const grade = form.watch("grade");
  const section = form.watch("section");
  const teacherChip = form.watch("teacherChip");

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
      Alert.alert("SL Selection submitted");
      form.reset(EMPTY_VALUES);
    } catch (err) {
      Alert.alert("Could not submit", apiErrorMessage(err));
    }
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="THINK & MAKE 2026-27" title="SL Selection Assessment — Form 4" showBack />
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

        {school && !form2Missing && (
          <SectionCard badge="A" title="Grade & section">
            <FormField label="Grade" required error={errors.grade?.message}>
              <Controller
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <SegmentedField
                    options={grades.map((g) => ({ value: String(g), label: `Grade ${g}` }))}
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v);
                      form.setValue("teacherChip", "");
                    }}
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
                    editable={!!grade && !fieldsDisabled}
                    value={field.value}
                    onChangeText={(v) => field.onChange(v.toUpperCase())}
                    placeholder="e.g. A"
                    placeholderTextColor="#94a3b8"
                    style={[styles.input, (!grade || fieldsDisabled) && styles.inputDisabled]}
                  />
                )}
              />
            </FormField>

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
            <SectionCard badge="B" title="Teacher">
              {teachersForGrade.length > 0 && (
                <Controller
                  control={form.control}
                  name="teacherChip"
                  render={({ field }) => (
                    <FormField label="Select teacher">
                      <SegmentedField
                        options={teachersForGrade.map((t) => ({ value: t.name, label: t.name }))}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={fieldsDisabled}
                      />
                    </FormField>
                  )}
                />
              )}
              <FormField
                label={teacherChip ? "Or enter a different teacher name" : "Enter teacher name"}
                required={!teacherChip}
                error={errors.teacherOverride?.message}
              >
                <Controller
                  control={form.control}
                  name="teacherOverride"
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
            </SectionCard>

            <SectionCard badge="C" title="Student Leaders">
              {slFields.map((field, index) => (
                <View key={field.id} style={styles.subCard}>
                  <View style={styles.subCardHeader}>
                    <Text style={styles.subCardTitle}>SL {index + 1}</Text>
                    {slFields.length > 1 && (
                      <TouchableOpacity disabled={fieldsDisabled} onPress={() => removeSl(index)}>
                        <Trash2 size={16} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <FormField label="SL name" required error={errors.sls?.[index]?.sl_name?.message}>
                    <Controller
                      control={form.control}
                      name={`sls.${index}.sl_name`}
                      render={({ field: f }) => (
                        <TextInput
                          editable={!fieldsDisabled}
                          value={f.value}
                          onChangeText={f.onChange}
                          style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Interested in role?" required error={errors.sls?.[index]?.interested_in_role?.message}>
                    <Controller
                      control={form.control}
                      name={`sls.${index}.interested_in_role`}
                      render={({ field: f }) => (
                        <SegmentedField options={YES_NO_OPTIONS} value={f.value} onChange={f.onChange} disabled={fieldsDisabled} />
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Attendance > 90% last year?"
                    required
                    error={errors.sls?.[index]?.attendance_above_90?.message}
                  >
                    <Controller
                      control={form.control}
                      name={`sls.${index}.attendance_above_90`}
                      render={({ field: f }) => (
                        <SegmentedField options={YES_NO_OPTIONS} value={f.value} onChange={f.onChange} disabled={fieldsDisabled} />
                      )}
                    />
                  </FormField>

                  <FormField label="SL status" required error={errors.sls?.[index]?.sl_status?.message}>
                    <Controller
                      control={form.control}
                      name={`sls.${index}.sl_status`}
                      render={({ field: f }) => (
                        <LabeledSelect
                          placeholder="Select..."
                          value={f.value}
                          onChange={f.onChange}
                          options={SL_STATUS_OPTIONS}
                          disabled={fieldsDisabled}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Speaks clearly?" required error={errors.sls?.[index]?.speaks_clearly?.message}>
                    <Controller
                      control={form.control}
                      name={`sls.${index}.speaks_clearly`}
                      render={({ field: f }) => (
                        <SegmentedField options={YES_NO_OPTIONS} value={f.value} onChange={f.onChange} disabled={fieldsDisabled} />
                      )}
                    />
                  </FormField>

                  <FormField label="Speaks loudly?" required error={errors.sls?.[index]?.speaks_loudly?.message}>
                    <Controller
                      control={form.control}
                      name={`sls.${index}.speaks_loudly`}
                      render={({ field: f }) => (
                        <SegmentedField options={YES_NO_OPTIONS} value={f.value} onChange={f.onChange} disabled={fieldsDisabled} />
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Understands English passage & explains in Telugu?"
                    required
                    error={errors.sls?.[index]?.understands_english?.message}
                  >
                    <Controller
                      control={form.control}
                      name={`sls.${index}.understands_english`}
                      render={({ field: f }) => (
                        <SegmentedField options={YES_NO_OPTIONS} value={f.value} onChange={f.onChange} disabled={fieldsDisabled} />
                      )}
                    />
                  </FormField>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.outlineButton, fieldsDisabled && styles.disabled]}
                disabled={fieldsDisabled}
                onPress={() => appendSl(EMPTY_SL_ENTRY)}
              >
                <Text style={styles.outlineButtonText}>+ Add another SL</Text>
              </TouchableOpacity>
            </SectionCard>

            <SectionCard badge="D" title="Sign-off">
              <FormField
                label="Teacher acknowledgement"
                required
                error={errors.teacher_acknowledged?.message}
                hint="Teacher approved this SL selection data."
              >
                <Controller
                  control={form.control}
                  name="teacher_acknowledged"
                  render={({ field }) => (
                    <SegmentedField options={YES_NO_OPTIONS} value={field.value} onChange={field.onChange} disabled={fieldsDisabled} />
                  )}
                />
              </FormField>
            </SectionCard>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.footerButton,
            styles.submitButton,
            (fieldsDisabled || bulkSubmit.isPending || !section.trim()) && styles.disabled,
          ]}
          disabled={fieldsDisabled || bulkSubmit.isPending || !section.trim()}
          onPress={onSubmit}
        >
          {bulkSubmit.isPending ? (
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
  subCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 12, gap: 4, marginTop: 4 },
  subCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subCardTitle: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 4 },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
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
