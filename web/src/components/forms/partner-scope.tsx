"use client";

import { useEffect } from "react";

import { useSchoolSelection } from "./school-selection-context";

/**
 * Keeps the shared selection in step with the partner in the URL, so a school
 * picked under one partner doesn't carry over after switching to another.
 */
export function PartnerScope({ partnerId, children }: { partnerId: string; children: React.ReactNode }) {
  const { partnerId: selectedPartnerId, setPartnerId, setSchoolId } = useSchoolSelection();

  useEffect(() => {
    if (selectedPartnerId !== partnerId) {
      setPartnerId(partnerId);
      setSchoolId("");
    }
  }, [partnerId, selectedPartnerId, setPartnerId, setSchoolId]);

  return children;
}
