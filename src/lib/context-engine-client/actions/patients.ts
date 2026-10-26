"use server";

import { toResult } from "@/lib/context-engine-client/actions/to-result";
import { serverClient } from "@/lib/context-engine-client/server";
import { err, errorMessage, ok, type Result } from "@/lib/result";
import type { Patient, PatientList } from "@clinia/context-engine-js";

export type PatientListItem = PatientList["data"][number];

/** `perPage` ceiling the patient listing enforces. */
const MAX_PATIENTS_PER_PAGE = 1000;

/**
 * Loads the patients currently registered in the Context Engine API.
 *
 * The patient switcher shows every patient at once, so this asks for the largest
 * page the endpoint allows rather than paging
 */
export async function listPatients(): Promise<PatientListItem[]> {
  const { data } = await serverClient.http.GET("/v1/patients", {
    params: { query: { page: 0, perPage: MAX_PATIENTS_PER_PAGE } },
  });
  return data?.data ?? [];
}

/**
 * Creates the patient entry if it does not exist, or returns the
 * existing record unchanged. Idempotent.
 */
export async function upsertPatient(patientId: string): Promise<Result<Patient>> {
  const { data, error } = await serverClient.http.PUT("/v1/patients/{patientId}", {
    params: { path: { patientId } },
  });
  return toResult(data, error);
}

/**
 * Removes a patient and all associated entities, events, and relationships from
 * the registry. Irreversible. Resolves to `ok` on a 204, including when the
 * patient was already gone (treated as success by the API contract).
 */
export async function deletePatient(patientId: string): Promise<Result<true>> {
  const { error } = await serverClient.http.DELETE("/v1/patients/{patientId}", {
    params: { path: { patientId } },
  });
  if (error) return err(errorMessage(error));
  return ok(true);
}
