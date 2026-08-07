"use client";

import { useTranslations } from "next-intl";
import React from "react";

import { NavDeletePatient } from "@/components/nav-delete-patient";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { MessageQuestionIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function NavSecondary({ ...props }: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const t = useTranslations("navActions");

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="#" />}>
              <HugeiconsIcon icon={MessageQuestionIcon} strokeWidth={2} />
              <span>{t("help")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <NavDeletePatient />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
