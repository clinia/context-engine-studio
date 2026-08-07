import * as React from "react";
import { AiBrain01Icon, SparklesIcon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { DynamicToolUIPart } from "ai";
import { useTranslations } from "next-intl";

import { Markdown } from "@/components/markdown";
import { ToolCluster } from "@/components/chat/tool-cluster";
import type { ChatStepUsage, ChatUIMessage } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

type MessagePart = ChatUIMessage["parts"][number];

/** Avatar + mono role header + body, the shared shape of every stream row. */
export function MessageRow({
  icon,
  iconClassName,
  label,
  children,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-4">
      <div
        className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", iconClassName)}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          <span>{label}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Splits an assistant turn's parts into steps, delimited by `step-start`. */
function splitSteps(parts: MessagePart[]): MessagePart[][] {
  const steps: MessagePart[][] = [];
  for (const part of parts) {
    if (part.type === "step-start") {
      steps.push([]);
      continue;
    }
    if (steps.length === 0) steps.push([]);
    steps[steps.length - 1].push(part);
  }
  return steps;
}

/** Renders the rows for one step's parts (reasoning, grouped tools, text). */
function StepRows({ parts }: { parts: MessagePart[] }) {
  const t = useTranslations("chat");
  const rows: React.ReactNode[] = [];
  let toolRun: DynamicToolUIPart[] = [];

  const flushTools = (key: string) => {
    if (toolRun.length === 0) return;
    rows.push(<ToolCluster key={key} parts={toolRun} />);
    toolRun = [];
  };

  parts.forEach((part, index) => {
    if (part.type === "dynamic-tool") {
      toolRun.push(part);
      return;
    }
    flushTools(`tools-${index}`);

    if (part.type === "reasoning") {
      if (!part.text.trim()) return;
      rows.push(
        <MessageRow
          key={index}
          icon={<HugeiconsIcon icon={AiBrain01Icon} className="size-3.5" />}
          iconClassName="bg-muted text-muted-foreground"
          label={t("reasoning")}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground italic">
            {part.text}
          </p>
        </MessageRow>,
      );
      return;
    }

    if (part.type === "text") {
      rows.push(
        <MessageRow
          key={index}
          icon={<HugeiconsIcon icon={SparklesIcon} className="size-3.5" />}
          iconClassName="bg-foreground text-background"
          label={t("assistant")}
        >
          <Markdown>{part.text}</Markdown>
        </MessageRow>,
      );
    }
  });
  flushTools("tools-end");

  return <>{rows}</>;
}

/** Per-step token usage caption, shown beneath a step once it finishes. */
function StepTokens({ usage }: { usage: ChatStepUsage }) {
  const t = useTranslations("chat");
  if (usage.totalTokens == null) return null;
  return (
    <p
      className="pl-10 font-mono text-[10px] text-muted-foreground/70"
      title={`↑${usage.inputTokens ?? 0} ↓${usage.outputTokens ?? 0}`}
    >
      {t("tokens", { count: usage.totalTokens })}
    </p>
  );
}

/** A user turn: plain text rows, no steps. */
function UserMessage({ message }: { message: ChatUIMessage }) {
  const t = useTranslations("chat");
  return (
    <>
      {message.parts.map((part, index) =>
        part.type === "text" ? (
          <MessageRow
            key={index}
            icon={<HugeiconsIcon icon={UserIcon} className="size-3.5" />}
            iconClassName="bg-secondary text-secondary-foreground"
            label={t("you")}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
          </MessageRow>
        ) : null,
      )}
    </>
  );
}

/** Renders one chat message; assistant turns are grouped into steps with token usage. */
export function ChatMessage({ message }: { message: ChatUIMessage }) {
  if (message.role !== "assistant") return <UserMessage message={message} />;

  const steps = splitSteps(message.parts);
  const stepUsages = message.metadata?.steps ?? [];

  return (
    <>
      {steps.map((parts, stepIndex) => {
        const usage = stepUsages[stepIndex];
        return (
          <div
            key={stepIndex}
            className={cn(stepIndex > 0 && "mt-2 border-t border-dashed border-border/60 pt-2")}
          >
            <StepRows parts={parts} />
            {usage ? <StepTokens usage={usage} /> : null}
          </div>
        );
      })}
    </>
  );
}
