"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { patientLabel, usePatient } from "@/contexts/patient-provider";
import { deletePatient } from "@/lib/context-engine-client/actions";
import { attempt } from "@/lib/result";

/**
 * Controlled confirmation dialog that deletes the active patient. On success it
 * drops the patient from local state (which reconciles the active patient) and
 * closes; on failure it surfaces the server error inline and stays open.
 *
 * The delete can't be undone, so the button enables only once the patient ID is typed.
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
  const [typed, setTyped] = React.useState("");
  const confirmed = !!activePatient && typed === activePatient.registryKey;

  // Reset the error and the typed ID whenever the dialog is (re)opened.
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setTyped("");
  }, [open]);

  const handleDelete = async () => {
    if (!activePatient || !confirmed) return;
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("deleteTitle", { id: activePatient?.registryKey ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activePatient ? t("deleteDescription", { name: patientLabel(activePatient) }) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {activePatient && (
          <Field>
            <FieldLabel htmlFor="delete-patient-confirm">
              {t("deleteConfirmLabel", { id: activePatient.registryKey })}
            </FieldLabel>
            <Input
              id="delete-patient-confirm"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && confirmed) handleDelete();
              }}
              disabled={isDeleting}
            />
          </Field>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={!confirmed || isDeleting}
          >
            {isDeleting ? t("deleting") : t("confirmDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
