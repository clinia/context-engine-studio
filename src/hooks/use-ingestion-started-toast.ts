"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useToast } from "@/components/ui/toast";

/**
 * Raises the notification that follows a patient's files being accepted: how
 * many went in, that the work runs in the background, and a way to go watch it.
 *
 * It does not auto-dismiss — the submissions outlive any timeout, and the offer
 * to open the ingestions view should still be there when the user looks back.
 */
export function useIngestionStartedToast(): (patientId: string, accepted: number) => void {
  const t = useTranslations("ingestions");
  const toast = useToast();
  const router = useRouter();

  return React.useCallback(
    (patientId: string, accepted: number) => {
      // Minted up front so the action can close the toast it belongs to.
      const id = crypto.randomUUID();
      toast.add({
        id,
        title: t("startedTitle", { count: accepted }),
        description: t("startedDescription"),
        timeout: 0,
        actionProps: {
          children: t("startedAction"),
          onClick: () => {
            toast.close(id);
            router.push(`/patients/${encodeURIComponent(patientId)}/ingestions`);
          },
        },
      });
    },
    [router, t, toast],
  );
}
