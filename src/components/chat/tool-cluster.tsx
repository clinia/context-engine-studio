"use client";

import * as React from "react";
import { ArrowDown01Icon, Loading03Icon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { DynamicToolUIPart } from "ai";
import { useTranslations } from "next-intl";

import { useToolInspector } from "@/components/chat/tool-inspector";
import { STATUS_DOT, formatArgs, toolStatus } from "@/components/chat/tool-format";
import { cn } from "@/lib/utils";

/** A run of consecutive tool calls, collapsed to a count and expandable to a list. */
export function ToolCluster({ parts }: { parts: DynamicToolUIPart[] }) {
  const t = useTranslations("chat");
  const { inspect } = useToolInspector();
  const [expanded, setExpanded] = React.useState(false);
  const running = parts.some((part) => toolStatus(part) === "running");

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <HugeiconsIcon
          icon={running ? Loading03Icon : Settings02Icon}
          className={cn("size-3.5", running && "animate-spin")}
        />
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-7 items-center gap-2 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <span>{t("toolCalls", { count: parts.length })}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={cn("size-3 transition-transform", !expanded && "-rotate-90")}
          />
        </button>

        {expanded ? (
          <ul className="mt-2 flex flex-col gap-1">
            {parts.map((part) => (
              <li key={part.toolCallId}>
                <button
                  type="button"
                  onClick={() => inspect(part)}
                  className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-left font-mono text-xs transition-colors hover:bg-muted"
                >
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[toolStatus(part)])}
                  />
                  <span className="shrink-0 font-medium">{part.toolName}</span>
                  <span className="truncate text-muted-foreground">({formatArgs(part.input)})</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
