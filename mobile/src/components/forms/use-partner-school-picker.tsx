import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";

import { FormField } from "@/components/form-field";
import { LabeledSelect } from "@/components/labeled-select";
import { usePartners, useSchoolDetail, useSchoolsByPartner } from "@/hooks/use-school-lookup";
import type { School } from "@/lib/types";

import { StatusBanner } from "./status-banner";

export function usePartnerSchoolPicker({
  isAdmin,
  submittedField,
  submittedBannerTitle,
  submittedBannerBody,
  onPartnerChange,
}: {
  isAdmin: boolean;
  /** Which boolean field on `School` marks this form as already submitted, e.g. "form1_submitted". */
  submittedField?: keyof School;
  submittedBannerTitle?: string;
  submittedBannerBody?: string;
  /** Called after the partner (and thus school selection) is reset — e.g. to reset a dependent form. */
  onPartnerChange?: () => void;
}) {
  const [partnerId, setPartnerId] = useState("");
  const [schoolId, setSchoolId] = useState("");

  const partnersQuery = usePartners();
  const schoolsQuery = useSchoolsByPartner(partnerId);
  const schoolDetailQuery = useSchoolDetail(schoolId);
  const school = schoolDetailQuery.data;

  const alreadySubmitted = submittedField ? !!school?.[submittedField] : false;
  const locked = alreadySubmitted && !isAdmin;

  function handlePartnerChange(value: string) {
    setPartnerId(value);
    setSchoolId("");
    onPartnerChange?.();
  }

  const picker = (
    <>
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
          style={styles.readOnlyInput}
        />
      </FormField>

      {schoolDetailQuery.isFetching && (
        <View style={styles.row}>
          <ActivityIndicator size="small" />
          <Text style={styles.hintInline}>Checking school data...</Text>
        </View>
      )}

      {alreadySubmitted && submittedBannerTitle && (
        <StatusBanner
          title={submittedBannerTitle}
          body={`${submittedBannerBody ?? ""} ${
            isAdmin ? "You can edit it as an admin." : "Please contact admin to make any changes."
          }`}
        />
      )}
    </>
  );

  return {
    partnerId,
    schoolId,
    setSchoolId,
    handlePartnerChange,
    partnersQuery,
    schoolsQuery,
    schoolDetailQuery,
    school,
    alreadySubmitted,
    locked,
    picker,
  };
}

const styles = StyleSheet.create({
  readOnlyInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f1f5f9",
    color: "#94a3b8",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintInline: { fontSize: 12, color: "#64748b" },
});
