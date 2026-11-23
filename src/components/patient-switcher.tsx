"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import { PatientIngestForm } from "@/components/patient-ingest-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { patientLabel, usePatient } from "@/contexts/patient-provider";
import { useIngestionStartedToast } from "@/hooks/use-ingestion-started-toast";
import type { PatientListItem } from "@/lib/context-engine-client/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PersonIcon } from "@/components/ui/icons/person";
import { AddIcon } from "@/components/ui/icons/add";
import { UnfoldMoreIcon } from "@/components/ui/icons/unfold-more";

/** The patient's up-to-two-letter initials, or the patient glyph when unnamed. */
function PatientAvatar({ item, size }: { item?: PatientListItem; size?: "sm" | "default" }) {
  const initials = item?.patient?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Avatar size={size}>
      <AvatarFallback className="font-medium">
        {initials || <PersonIcon className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

export function PatientSwitcher() {
  const t = useTranslations("patientSwitcher");
  const tIngest = useTranslations("patientIngest");
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { patients, activePatient } = usePatient();
  const [createOpen, setCreateOpen] = React.useState(false);
  // The form is sending, or waiting for the user to continue: closing would lose its marks.
  const [formLocked, setFormLocked] = React.useState(false);
  const notifyIngestionStarted = useIngestionStartedToast();

  const handleCreated = (patientId: string, accepted: number) => {
    setCreateOpen(false);
    notifyIngestionStarted(patientId, accepted);
    router.push(`/patients/${encodeURIComponent(patientId)}`);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                data-testid="patient-switcher-trigger"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <PatientAvatar item={activePatient ?? undefined} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {activePatient ? patientLabel(activePatient) : t("selectPatient")}
              </span>
              {activePatient && (
                <span className="truncate text-xs text-muted-foreground">
                  {activePatient.registryKey}
                </span>
              )}
            </div>
            <UnfoldMoreIcon className="ml-auto opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("patients")}
              </DropdownMenuLabel>
              {patients.length === 0 ? (
                <DropdownMenuItem disabled className="gap-2 p-2 text-muted-foreground">
                  {t("noPatients")}
                </DropdownMenuItem>
              ) : (
                patients.map((patient) => (
                  <DropdownMenuItem
                    key={patient.registryKey}
                    onClick={() =>
                      router.push(`/patients/${encodeURIComponent(patient.registryKey)}`)
                    }
                    className="gap-2 p-2"
                  >
                    <PatientAvatar item={patient} size="sm" />
                    <span className="truncate">{patientLabel(patient)}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={() => setCreateOpen(true)}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <AddIcon className="size-4" />
              </div>
              <span className="font-medium text-muted-foreground">{t("createPatient")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open || !formLocked) setCreateOpen(open);
        }}
      >
        {/* A long file list scrolls inside the dialog rather than past the viewport. */}
        <DialogContent className="max-h-[90vh] overflow-y-auto" showCloseButton={!formLocked}>
          <DialogHeader>
            <DialogTitle>{tIngest("createTitle")}</DialogTitle>
            <DialogDescription>{tIngest("createDescription")}</DialogDescription>
          </DialogHeader>
          <PatientIngestForm onSuccess={handleCreated} onLockedChange={setFormLocked} />
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
