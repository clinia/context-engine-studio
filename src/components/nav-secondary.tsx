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
import { HelpIcon } from "@/components/ui/icons/help";

export function NavSecondary({ ...props }: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const t = useTranslations("navActions");

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<a href="https://docs.clinia.com" target="_blank" rel="noreferrer" />}
            >
              <HelpIcon />
              <span>{t("help")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <NavDeletePatient />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
