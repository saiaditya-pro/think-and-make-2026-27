"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePartners, useSchoolDetail, useSchoolsByPartner } from "@/hooks/use-school-lookup";
import type { School } from "@/lib/types";

import { Field } from "./field";
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
      <Field label="Select Partner" required>
        <Select
          items={partnersQuery.data?.results.map((p) => ({ value: String(p.id), label: p.name })) ?? []}
          value={partnerId}
          onValueChange={(v) => handlePartnerChange(v ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {partnersQuery.data?.results.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {partnersQuery.isError && (
        <StatusBanner
          title="Couldn't load partners."
          body="Check your connection and try again."
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => partnersQuery.refetch()}>
              Retry
            </Button>
          }
        />
      )}

      <Field label="Select School" required>
        <Select
          items={schoolsQuery.data?.results.map((s) => ({ value: String(s.id), label: s.name })) ?? []}
          value={schoolId}
          onValueChange={(v) => setSchoolId(v ?? "")}
          disabled={!partnerId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={partnerId ? "Select..." : "Select partner first..."} />
          </SelectTrigger>
          <SelectContent>
            {schoolsQuery.data?.results.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Schools load from the roster and filter by partner.</p>
      </Field>

      {schoolsQuery.isError && (
        <StatusBanner
          title="Couldn't load schools for this partner."
          body="Check your connection and try again."
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => schoolsQuery.refetch()}>
              Retry
            </Button>
          }
        />
      )}

      <Field label="School Code">
        <Input readOnly value={school?.school_code ?? ""} placeholder="auto-filled" className="bg-muted/50" />
      </Field>

      {schoolDetailQuery.isFetching && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Checking school data...
        </p>
      )}

      {alreadySubmitted && submittedBannerTitle && (
        <StatusBanner
          title={submittedBannerTitle}
          body={`${submittedBannerBody} ${isAdmin ? "You can edit it as an admin." : "Please contact admin to make any changes."}`}
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
