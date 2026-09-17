"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { NavChats } from "@/components/nav-chats";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavVfs } from "@/components/nav-vfs";
import { PatientSwitcher } from "@/components/patient-switcher";
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { usePatient } from "@/contexts/patient-provider";
import { useVfsRoute } from "@/hooks/use-vfs-route";
import { InboxUploadIcon, MessageAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("ingestions");
  const { activePatient } = usePatient();
  const { selectedPath, selectFile } = useVfsRoute();
  const router = useRouter();
  const pathname = usePathname();

  // Each click starts a fresh chat — generated client-side now, mapping to a
  // engine session later. The id is minted on click (not at render) to avoid a
  // hydration mismatch from a server/client id divergence.
  const startChat = React.useCallback(() => {
    const patientId = activePatient?.registryKey;
    if (!patientId) return;
    router.push(`/patients/${encodeURIComponent(patientId)}/chat/${crypto.randomUUID()}`);
  }, [activePatient?.registryKey, router]);

  const ingestionsUrl = activePatient
    ? `/patients/${encodeURIComponent(activePatient.registryKey)}/ingestions`
    : undefined;

  const navMain = [
    {
      title: "New chat",
      onClick: startChat,
      icon: <HugeiconsIcon icon={MessageAdd01Icon} strokeWidth={2} />,
    },
    {
      title: t("navLabel"),
      url: ingestionsUrl,
      isActive: ingestionsUrl !== undefined && pathname === ingestionsUrl,
      icon: <HugeiconsIcon icon={InboxUploadIcon} strokeWidth={2} />,
    },
  ];

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <PatientSwitcher />
        <NavMain items={navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavChats key={`chats-${activePatient?.registryKey ?? "none"}`} />
        <NavVfs
          key={activePatient?.registryKey ?? "none"}
          selectedPath={selectedPath}
          onSelectFile={selectFile}
        />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
