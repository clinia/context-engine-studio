"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { PatientIngestForm } from "@/components/patient-ingest-form";

export function PatientOnboarding() {
  const t = useTranslations("patientIngest");
  const router = useRouter();

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t("onboardingTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("onboardingDescription")}</p>
        </div>
        <PatientIngestForm
          onSuccess={(patientId) => router.push(`/patients/${encodeURIComponent(patientId)}`)}
        />
      </div>
    </main>
  );
}
