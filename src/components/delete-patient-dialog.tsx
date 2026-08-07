"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { patientLabel, usePatient } from "@/contexts/patient-provider";
import { deletePatient } from "@/lib/context-engine-client/actions";
import { attempt } from "@/lib/result";

/**
 * Controlled confirmation dialog that deletes the active patient. On success it
 * drops the patient from local state (which reconciles the active patient) and
 * closes; on failure it surfaces the server error inline and stays open.
 */
export function DeletePatientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("navActions");
  const router = useRouter();
  const { activePatient } = usePatient();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset the error whenever the dialog is (re)opened.
  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleDelete = async () => {
    if (!activePatient) return;
    setIsDeleting(true);
    setError(null);

    const result = await attempt(deletePatient(activePatient.registryKey));
    setIsDeleting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
    // `/` redirects to the first remaining patient, or to /onboarding when none
    // are left — covering both post-delete cases.
    router.push("/");
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {activePatient ? t("deleteDescription", { name: patientLabel(activePatient) }) : null}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isDeleting} />}>
            {t("cancel")}
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? t("deleting") : t("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
