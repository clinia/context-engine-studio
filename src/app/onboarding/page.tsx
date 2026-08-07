import { redirect } from "next/navigation";

import { PatientOnboarding } from "@/components/patient-onboarding";
import { listPatients } from "@/lib/context-engine-client/actions";

// Reads live patient data at render, so it must render per request rather than
// be statically prerendered at build time (which would hit the engine API).
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const patients = await listPatients();
  if (patients.length > 0) redirect("/");

  return <PatientOnboarding />;
}
