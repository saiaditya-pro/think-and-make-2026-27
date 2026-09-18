import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { z } from "zod";

import { ChipMultiselect } from "@/components/chip-multiselect";
import { FormField } from "@/components/form-field";
import { SectionCard } from "@/components/forms/section-card";
import { StatusBanner } from "@/components/forms/status-banner";
import { usePartnerSchoolPicker } from "@/components/forms/use-partner-school-picker";
import { LabeledSelect } from "@/components/labeled-select";
import { ScreenHeader } from "@/components/screen-header";
import { useSubmitForm2 } from "@/features/contact-info/use-contact-info-data";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth-context";
import { parseGradesOffered } from "@/lib/grades";
import type { School } from "@/lib/types";

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

export default function ContactInfoScreen() {
  const { auth } = useAuth();
  const isAdmin = auth?.user.role === "admin";
  const router = useRouter();

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
      Alert.alert("Form 2 submitted");
    } catch (err) {
      Alert.alert("Could not submit", apiErrorMessage(err));
    }
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="THINK & MAKE 2026-27" title="Schools Contact Info — Form 2" showBack />
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
        </SectionCard>

        {school && !form1Missing && (
          <>
            <SectionCard badge="1" title="Prefilled from Form 1">
              <FormField label="Google Maps location">
                <TextInput editable={false} value={school.maps_link} style={[styles.input, styles.inputDisabled]} />
              </FormField>
              <FormField label="Principal">
                <TextInput
                  editable={false}
                  value={`${school.principal_name} · ${school.principal_phone}`}
                  style={[styles.input, styles.inputDisabled]}
                />
              </FormField>
              <FormField label="Grades participating">
                <TextInput
                  editable={false}
                  value={grades.map((g) => `Grade ${g}`).join(", ")}
                  style={[styles.input, styles.inputDisabled]}
                />
              </FormField>
            </SectionCard>

            <SectionCard badge="2" title="Teachers">
              <FormField label="IIF Point of Contact" required error={errors.iif_poc?.message}>
                <Controller
                  control={form.control}
                  name="iif_poc"
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

              {teacherFields.map((field, index) => (
                <View key={field.id} style={styles.subCard}>
                  <View style={styles.subCardHeader}>
                    <Text style={styles.subCardTitle}>Teacher {index + 1}</Text>
                    {teacherFields.length > 1 && (
                      <TouchableOpacity disabled={fieldsDisabled} onPress={() => removeTeacher(index)}>
                        <Trash2 size={16} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <FormField label="Name" required error={errors.teachers?.[index]?.name?.message}>
                    <Controller
                      control={form.control}
                      name={`teachers.${index}.name`}
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
                  <FormField label="Phone" required error={errors.teachers?.[index]?.phone?.message}>
                    <Controller
                      control={form.control}
                      name={`teachers.${index}.phone`}
                      render={({ field: f }) => (
                        <TextInput
                          editable={!fieldsDisabled}
                          value={f.value}
                          onChangeText={f.onChange}
                          keyboardType="phone-pad"
                          placeholder="10-digit mobile"
                          placeholderTextColor="#94a3b8"
                          style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Grades taught" required error={errors.teachers?.[index]?.grades_taught?.message}>
                    <Controller
                      control={form.control}
                      name={`teachers.${index}.grades_taught`}
                      render={({ field: f }) => (
                        <ChipMultiselect options={grades} value={f.value} onChange={f.onChange} disabled={fieldsDisabled} />
                      )}
                    />
                  </FormField>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.outlineButton, fieldsDisabled && styles.disabled]}
                disabled={fieldsDisabled}
                onPress={() => appendTeacher({ name: "", phone: "", grades_taught: [] })}
              >
                <Text style={styles.outlineButtonText}>+ Add another teacher</Text>
              </TouchableOpacity>
            </SectionCard>

            <SectionCard badge="3" title="Session schedule">
              {grades.map((g, index) => (
                <View key={g} style={styles.subCard}>
                  <Text style={styles.subCardTitle}>Grade {g}</Text>
                  <FormField label="Day" required error={errors.schedules?.[index]?.day_of_week?.message}>
                    <Controller
                      control={form.control}
                      name={`schedules.${index}.day_of_week`}
                      render={({ field: f }) => (
                        <LabeledSelect
                          placeholder="Select..."
                          value={f.value}
                          onChange={f.onChange}
                          options={DAY_OPTIONS}
                          disabled={fieldsDisabled}
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Time" required error={errors.schedules?.[index]?.time?.message} hint="24-hour, e.g. 15:30">
                    <Controller
                      control={form.control}
                      name={`schedules.${index}.time`}
                      render={({ field: f }) => (
                        <TextInput
                          editable={!fieldsDisabled}
                          value={f.value}
                          onChangeText={f.onChange}
                          placeholder="HH:MM"
                          placeholderTextColor="#94a3b8"
                          style={[styles.input, fieldsDisabled && styles.inputDisabled]}
                        />
                      )}
                    />
                  </FormField>
                </View>
              ))}
            </SectionCard>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.submitButton, (fieldsDisabled || submitForm2.isPending) && styles.disabled]}
          disabled={fieldsDisabled || submitForm2.isPending}
          onPress={onSubmit}
        >
          {submitForm2.isPending ? (
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
