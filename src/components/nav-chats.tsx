"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { usePatient } from "@/contexts/patient-provider";
import { listChats } from "@/lib/chat/actions";
import { onChatsChanged } from "@/lib/chat/events";
import type { ChatSummary } from "@/persistence/chat-store";
import { MessageMultiple01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type ChatsState =
  | { status: "loading" }
  | { status: "loaded"; chats: ChatSummary[] }
  | { status: "error" };

function TreeMessage({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-1 text-xs text-sidebar-foreground/60">{children}</div>;
}

/**
 * "Chats" sidebar group: the active patient's saved chats, most-recent-first,
 * each linking back to `/patients/{patientId}/chat/{sessionId}` to reopen and
 * continue the conversation. Keyed by patient in the sidebar, so switching
 * patients remounts it with fresh state; it also refetches when the open chat
 * changes so a just-continued chat resurfaces at the top.
 */
export function NavChats() {
  const { activePatient } = usePatient();
  const t = useTranslations("navChats");
  const params = useParams<{ id?: string }>();
  const registryKey = activePatient?.registryKey ?? null;
  const currentId = params?.id;

  const [state, setState] = React.useState<ChatsState>({ status: "loading" });
  // Bumped on a chat-list change event so the fetch effect re-runs.
  const [reloadKey, setReloadKey] = React.useState(0);

  // Refetch as soon as a chat is saved (e.g. a new chat's first message), so it
  // appears in the list without a reload.
  React.useEffect(() => onChatsChanged(() => setReloadKey((key) => key + 1)), []);

  React.useEffect(() => {
    if (!registryKey) return;
    let cancelled = false;

    void (async () => {
      const res = await listChats(registryKey);
      if (cancelled) return;
      setState(res.ok ? { status: "loaded", chats: res.data } : { status: "error" });
    })();

    return () => {
      cancelled = true;
    };
    // Also refetch when the open chat changes (keeps the active row correct) and
    // when a save event bumps reloadKey.
  }, [registryKey, currentId, reloadKey]);

  if (!registryKey) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("label")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {state.status === "loading" && (
            <>
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
            </>
          )}
          {state.status === "error" && <TreeMessage>{t("loadError")}</TreeMessage>}
          {state.status === "loaded" && state.chats.length === 0 && (
            <TreeMessage>{t("empty")}</TreeMessage>
          )}
          {state.status === "loaded" &&
            state.chats.map((chat) => (
              <SidebarMenuItem key={chat.sessionId}>
                <SidebarMenuButton
                  isActive={chat.sessionId === currentId}
                  title={chat.title}
                  render={
                    <Link
                      href={`/patients/${encodeURIComponent(registryKey)}/chat/${chat.sessionId}`}
                    />
                  }
                >
                  <HugeiconsIcon icon={MessageMultiple01Icon} strokeWidth={2} />
                  <span className="truncate">{chat.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
