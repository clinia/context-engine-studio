"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DeletePatientDialog } from "@/components/delete-patient-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePatient } from "@/contexts/patient-provider";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  MessageQuestionIcon,
  MoreHorizontalCircle01Icon,
} from "@hugeicons/core-free-icons";

export function NavActions() {
  const t = useTranslations("navActions");
  const { activePatient } = usePatient();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2 text-sm">
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          render={<Button variant="ghost" size="icon" className="h-7 w-7 data-open:bg-accent" />}
        >
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
        </PopoverTrigger>
        <PopoverContent className="w-56 overflow-hidden rounded-lg p-0" align="end">
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              <SidebarGroup className="border-b">
                <SidebarGroupContent className="gap-0">
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        disabled={!activePatient}
                        className="text-destructive hover:text-destructive focus:text-destructive"
                        onClick={() => {
                          setMenuOpen(false);
                          setConfirmOpen(true);
                        }}
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                        <span>{t("deletePatient")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupContent className="gap-0">
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<a href="#" />}>
                        <HugeiconsIcon icon={MessageQuestionIcon} strokeWidth={2} />
                        <span>{t("help")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>

      <DeletePatientDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </div>
  );
}
