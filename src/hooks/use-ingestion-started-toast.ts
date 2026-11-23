"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import { toast } from "sonner";

/**
 * Raises the notification that follows a patient's files being accepted: how many went
 * in, that the work runs in the background, and a way to go watch it. The form reports
 * the files that did not go in.
 *
 * It does not auto-dismiss — the submissions outlive any timeout, and the offer
 * to open the ingestions view should still be there when the user looks back.
 */
export function useIngestionStartedToast(): (patientId: string, accepted: number) => void {
  const t = useTranslations("ingestions");
  const router = useRouter();

  return React.useCallback(
    (patientId: string, accepted: number) => {
      // Minted up front so the action can close the toast it belongs to.
      const id = crypto.randomUUID();
      toast(t("startedTitle", { count: accepted }), {
        id,
        description: t("startedDescription"),
        duration: Infinity,
        action: {
          label: t("startedAction"),
          onClick: () => {
            toast.dismiss(id);
            router.push(`/patients/${encodeURIComponent(patientId)}/ingestions`);
          },
        },
      });
    },
    [router, t],
  );
}
