"use server";

import { defineAction } from "@/core/request-scope";
import { toResult } from "@/lib/context-engine-client/actions/to-result";
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
export const listPatients = defineAction(async (driver): Promise<PatientListItem[]> => {
  const client = driver.getContextEngineClient();
  const { data } = await client.http.GET("/v1/patients", {
    params: { query: { page: 0, perPage: MAX_PATIENTS_PER_PAGE } },
  });
  return data?.data ?? [];
});

/**
 * Creates the patient entry if it does not exist, or returns the
 * existing record unchanged. Idempotent.
 */
export const upsertPatient = defineAction(
  async (driver, patientId: string): Promise<Result<Patient>> => {
    const client = driver.getContextEngineClient();
    const { data, error } = await client.http.PUT("/v1/patients/{patientId}", {
      params: { path: { patientId } },
    });
    return toResult(data, error);
  },
);

/**
 * Removes a patient and all associated entities, events, and relationships from
 * the registry. Irreversible. Resolves to `ok` on a 204, including when the
 * patient was already gone (treated as success by the API contract).
 */
export const deletePatient = defineAction(
  async (driver, patientId: string): Promise<Result<true>> => {
    const client = driver.getContextEngineClient();
    const { error } = await client.http.DELETE("/v1/patients/{patientId}", {
      params: { path: { patientId } },
    });
    if (error) return err(errorMessage(error));
    return ok(true);
  },
);
