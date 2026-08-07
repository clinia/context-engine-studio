"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { ChatMessage, MessageRow } from "@/components/chat/chat-message";
import { Composer } from "@/components/chat/composer";
import { ToolInspectorProvider } from "@/components/chat/tool-inspector";
import { NavActions } from "@/components/nav-actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { saveChat } from "@/lib/chat/actions";
import { emitChatsChanged } from "@/lib/chat/events";
import type { ChatUIMessage } from "@/lib/chat-types";
import { generateMemories } from "@/lib/context-engine-client/actions";

type ChatPanelProps = {
  /** Patient that scopes the chat endpoint and the MCP tools. */
  patientId: string;
  /** Chat id; maps to an engine session and is sent as `sessionId` to the API. */
  sessionId: string;
  /** Transcript loaded from the persisted session (empty for a fresh chat). */
  initialMessages: ChatUIMessage[];
};

/** Three pulsing dots, shown while the assistant turn is still forming. */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 pt-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-2 animate-pulse rounded-full bg-muted-foreground"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export function ChatPanel({ patientId, sessionId, initialMessages }: ChatPanelProps) {
  const t = useTranslations("chat");
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // Whether the viewport is pinned to the bottom; drives whether we auto-follow.
  const atBottomRef = React.useRef(true);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/patients/${encodeURIComponent(patientId)}/chat`,
        body: { sessionId },
      }),
    [patientId, sessionId],
  );

  const { messages, sendMessage, status, error, stop } = useChat<ChatUIMessage>({
    id: sessionId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  // Persist the transcript to the studio-local chat store on the two status
  // transitions that bound a turn:
  //   • turn start (idle → submitted): `messages` already holds the new user
  //     message, so the chat row + title are created and the sidebar shows the
  //     chat immediately — no waiting on the (possibly long, tool-using) reply.
  //   • turn end (busy → ready): `messages` holds the full list incl. the
  //     assistant reply and its token metadata, so reopen/sidebar reflect it.
  // The ref guard limits writes to those transitions rather than every streaming
  // delta; each successful save nudges the sidebar to refetch.
  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    const wasBusy = prevStatus === "submitted" || prevStatus === "streaming";
    const isBusyNow = status === "submitted" || status === "streaming";
    const turnStarted = !wasBusy && isBusyNow;
    const turnEnded = wasBusy && status === "ready";
    if ((turnStarted || turnEnded) && messages.length > 0) {
      void saveChat(patientId, sessionId, messages).then((result) => {
        if (result.ok) emitChatsChanged();
      });
    }
  }, [status, messages, patientId, sessionId]);

  // On-demand memory generation for the current session (backend job over the
  // transcript persisted by the chat route). Kept explicit — the backend
  // re-extracts the whole transcript each call, so it shouldn't run every turn.
  const [memoryStatus, setMemoryStatus] = React.useState<"idle" | "pending" | "done" | "error">(
    "idle",
  );
  const handleGenerateMemories = React.useCallback(async () => {
    setMemoryStatus("pending");
    const result = await generateMemories(patientId, sessionId);
    setMemoryStatus(result.ok ? "done" : "error");
  }, [patientId, sessionId]);

  const memoryLabel = {
    idle: t("generateMemories"),
    pending: t("generatingMemories"),
    done: t("memoriesGenerated"),
    error: t("memoriesFailed"),
  }[memoryStatus];

  const totalTokens = messages.reduce(
    (sum, message) => sum + (message.metadata?.totalTokens ?? 0),
    0,
  );
  const turns = messages.reduce((count, message) => count + (message.role === "user" ? 1 : 0), 0);

  // Follow the latest content as the conversation grows or streams, but only
  // while the user is already at the bottom — otherwise leave their scroll
  // position alone so they can read back during generation.
  React.useEffect(() => {
    if (!atBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  // Track whether the viewport is pinned to the bottom. A small threshold keeps
  // us "at bottom" through the smooth-scroll animation and sub-pixel rounding.
  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    // A new message changes the transcript, so any prior memory-generation result
    // is now stale — reset the affordance so the user can regenerate over the new
    // content (leave an in-flight run alone; it'll settle to its own terminal state).
    setMemoryStatus((prev) => (prev === "pending" ? prev : "idle"));
    void sendMessage({ text });
  };

  const stats =
    messages.length > 0 ? (
      <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        {t("turns", { count: turns })}
        {totalTokens > 0 ? ` · ${t("tokens", { count: totalTokens })}` : ""}
      </span>
    ) : null;

  return (
    <ToolInspectorProvider>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <PageHeader
          actions={
            <>
              {stats}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleGenerateMemories()}
                disabled={memoryStatus === "pending" || messages.length === 0}
              >
                <HugeiconsIcon icon={SparklesIcon} />
                {memoryLabel}
              </Button>
              <NavActions />
            </>
          }
        />

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-8">
            {messages.length === 0 ? (
              <div className="pt-10">
                <p className="mb-2 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  {"// sandbox"}
                </p>
                <p className="text-lg font-medium text-muted-foreground">{t("empty")}</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </div>
            )}

            {status === "submitted" ? (
              <MessageRow
                icon={<HugeiconsIcon icon={SparklesIcon} className="size-3.5" />}
                iconClassName="bg-foreground text-background"
                label={t("assistant")}
              >
                <TypingDots />
              </MessageRow>
            ) : null}

            {error ? <p className="py-4 text-sm text-destructive">{t("error")}</p> : null}

            <div ref={bottomRef} />
          </div>
        </div>

        <Composer
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onStop={stop}
          isBusy={isBusy}
        />
      </div>
    </ToolInspectorProvider>
  );
}
