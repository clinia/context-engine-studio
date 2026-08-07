import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function PatientNotFound() {
  const t = useTranslations("patientNotFound");

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <Button render={<Link href="/" />}>{t("back")}</Button>
      </div>
    </main>
  );
}
