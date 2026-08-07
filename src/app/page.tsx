import { redirect } from "next/navigation";

import { listPatients } from "@/lib/context-engine-client/actions";

// Reads live patient data to decide where to send the user, so it must render
// per request — never be statically prerendered at build time (which would hit
// the engine API with no server running).
export const dynamic = "force-dynamic";

export default async function Page() {
  const patients = await listPatients();
  if (patients.length === 0) redirect("/onboarding");

  redirect(`/patients/${encodeURIComponent(patients[0].registryKey)}`);
}
