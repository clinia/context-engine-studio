"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { NavChats } from "@/components/nav-chats";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavVfs } from "@/components/nav-vfs";
import { PatientSwitcher } from "@/components/patient-switcher";
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { usePatient } from "@/contexts/patient-provider";
import { useVfsRoute } from "@/hooks/use-vfs-route";
import { MessageAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { activePatient } = usePatient();
  const { selectedPath, selectFile } = useVfsRoute();
  const router = useRouter();

  // Each click starts a fresh chat — generated client-side now, mapping to a
  // engine session later. The id is minted on click (not at render) to avoid a
  // hydration mismatch from a server/client id divergence.
  const startChat = React.useCallback(() => {
    const registryKey = activePatient?.registryKey;
    if (!registryKey) return;
    router.push(`/patients/${encodeURIComponent(registryKey)}/chat/${crypto.randomUUID()}`);
  }, [activePatient?.registryKey, router]);

  const navMain = [
    {
      title: "New chat",
      onClick: startChat,
      icon: <HugeiconsIcon icon={MessageAdd01Icon} strokeWidth={2} />,
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
