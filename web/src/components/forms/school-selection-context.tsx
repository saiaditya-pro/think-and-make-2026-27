"use client";

import { createContext, useContext, useState } from "react";

type SchoolSelectionValue = {
  partnerId: string;
  schoolId: string;
  setPartnerId: (value: string) => void;
  setSchoolId: (value: string) => void;
};

const SchoolSelectionContext = createContext<SchoolSelectionValue | null>(null);

/**
 * Carries the selected partner/school across all 5 forms -- provided once in
 * `dashboard/layout.tsx` so it survives client-side navigation between
 * sibling routes (the layout stays mounted; only `usePartnerSchoolPicker`
 * used to hold this in per-page local state).
 */
export function SchoolSelectionProvider({ children }: { children: React.ReactNode }) {
  const [partnerId, setPartnerId] = useState("");
  const [schoolId, setSchoolId] = useState("");

  return (
    <SchoolSelectionContext.Provider value={{ partnerId, schoolId, setPartnerId, setSchoolId }}>
      {children}
    </SchoolSelectionContext.Provider>
  );
}

export function useSchoolSelection() {
  const context = useContext(SchoolSelectionContext);
  if (!context) {
    throw new Error("useSchoolSelection must be used within a SchoolSelectionProvider.");
  }
  return context;
}
