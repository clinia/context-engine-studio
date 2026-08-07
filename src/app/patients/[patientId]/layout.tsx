import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PatientProvider } from "@/contexts/patient-provider";
import { listPatients } from "@/lib/context-engine-client/actions";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const id = decodeURIComponent(patientId);

  const patients = await listPatients();
  if (patients.length === 0) redirect("/onboarding");
  if (!patients.some((patient) => patient.registryKey === id)) notFound();

  return (
    <PatientProvider initialPatients={patients} activePatientId={id}>
      <SidebarProvider>
        <Suspense>
          <AppSidebar />
        </Suspense>
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </PatientProvider>
  );
}
