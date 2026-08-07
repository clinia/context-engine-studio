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
import type { PatientListItem } from "@/lib/context-engine-client/actions";
import { PatientIcon, PlusSignIcon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** Up-to-two-letter initials for a patient, or the patient glyph when unnamed. */
function PatientAvatar({ item, className }: { item: PatientListItem; className?: string }) {
  if (!item.patient?.name) {
    return <HugeiconsIcon icon={PatientIcon} strokeWidth={2} className={className} />;
  }

  const initials = item.patient.name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return <span className="text-xs font-semibold">{initials}</span>;
}

export function PatientSwitcher() {
  const t = useTranslations("patientSwitcher");
  const tIngest = useTranslations("patientIngest");
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { patients, activePatient } = usePatient();
  const [createOpen, setCreateOpen] = React.useState(false);

  const handleCreated = (patientId: string) => {
    setCreateOpen(false);
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
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {activePatient ? (
                <PatientAvatar item={activePatient} className="size-4" />
              ) : (
                <HugeiconsIcon icon={PatientIcon} strokeWidth={2} className="size-4" />
              )}
            </div>
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
            <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="ml-auto opacity-50" />
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
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <PatientAvatar item={patient} className="size-4" />
                    </div>
                    <span className="truncate">{patientLabel(patient)}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={() => setCreateOpen(true)}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
              </div>
              <span className="font-medium text-muted-foreground">{t("createPatient")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tIngest("createTitle")}</DialogTitle>
            <DialogDescription>{tIngest("createDescription")}</DialogDescription>
          </DialogHeader>
          <PatientIngestForm onSuccess={handleCreated} />
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
