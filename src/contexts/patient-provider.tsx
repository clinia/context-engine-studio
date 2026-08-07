"use client";

import * as React from "react";

import { listPatients, type PatientListItem } from "@/lib/context-engine-client/actions";

type PatientContextProps = {
  patients: PatientListItem[];
  /** The patient addressed by the current URL, or `null` when unknown. */
  activePatient: PatientListItem | null;
  /** Re-fetches the patient list from the server and returns the fresh list. */
  refresh: () => Promise<PatientListItem[]>;
};

const PatientContext = React.createContext<PatientContextProps | null>(null);

export function usePatient() {
  const context = React.useContext(PatientContext);
  if (!context) {
    throw new Error("usePatient must be used within a PatientProvider.");
  }

  return context;
}

/** Display label for a patient, falling back to its registry key. */
export function patientLabel(item: PatientListItem): string {
  return item.patient?.name ?? item.registryKey ?? "Unnamed patient";
}

export function PatientProvider({
  initialPatients,
  activePatientId,
  children,
}: {
  initialPatients: PatientListItem[];
  /** Registry key of the patient addressed by the current route. */
  activePatientId: string;
  children: React.ReactNode;
}) {
  const [patients, setPatients] = React.useState(initialPatients);

  // Keep local state in sync when the server re-seeds the provider (e.g. the
  // layout refetches the list on navigation between patients).
  React.useEffect(() => {
    setPatients(initialPatients);
  }, [initialPatients]);

  const refresh = React.useCallback(async () => {
    const next = await listPatients();
    setPatients(next);
    return next;
  }, []);

  const activePatient = React.useMemo(
    () => patients.find((patient) => patient.registryKey === activePatientId) ?? null,
    [patients, activePatientId],
  );

  const contextValue = React.useMemo<PatientContextProps>(
    () => ({ patients, activePatient, refresh }),
    [patients, activePatient, refresh],
  );

  return <PatientContext.Provider value={contextValue}>{children}</PatientContext.Provider>;
}
