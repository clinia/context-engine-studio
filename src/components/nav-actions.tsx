"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DeletePatientDialog } from "@/components/delete-patient-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePatient } from "@/contexts/patient-provider";
import { DeleteIcon } from "@/components/ui/icons/delete";
import { HelpIcon } from "@/components/ui/icons/help";
import { MoreHorizIcon } from "@/components/ui/icons/more-horiz";

export function NavActions() {
  const t = useTranslations("navActions");
  const { activePatient } = usePatient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2 text-sm">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={t("moreActions")} />}
        >
          <MoreHorizIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuItem
            variant="destructive"
            disabled={!activePatient}
            onClick={() => setConfirmOpen(true)}
          >
            <DeleteIcon />
            {t("deletePatient")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={<a href="https://docs.clinia.com" target="_blank" rel="noreferrer" />}
          >
            <HelpIcon />
            {t("help")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeletePatientDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </div>
  );
}
