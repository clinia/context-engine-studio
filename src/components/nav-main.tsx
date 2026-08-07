"use client";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    icon: React.ReactNode;
    /** Navigation target. Omit when handling the click imperatively via `onClick`. */
    url?: string;
    /** Click handler used in place of `url` (e.g. to start a fresh chat). */
    onClick?: () => void;
    isActive?: boolean;
  }[];
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            isActive={item.isActive}
            onClick={item.onClick}
            render={item.url ? <a href={item.url} /> : <button type="button" />}
          >
            {item.icon}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
