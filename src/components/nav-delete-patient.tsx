"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { DeletePatientDialog } from "@/components/delete-patient-dialog";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { usePatient } from "@/contexts/patient-provider";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";

/** Sidebar menu item that deletes the active patient behind a confirm dialog. */
export function NavDeletePatient() {
  const t = useTranslations("navActions");
  const { activePatient } = usePatient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled={!activePatient}
          className="text-destructive hover:text-destructive focus:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          <span>{t("deletePatient")}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <DeletePatientDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
