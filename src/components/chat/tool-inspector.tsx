"use client";

import * as React from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { DynamicToolUIPart } from "ai";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { STATUS_DOT, formatJson, toolStatus } from "@/components/chat/tool-format";
import { cn } from "@/lib/utils";

type ToolInspectorContextValue = {
  /** Opens the detail panel for a single tool call. */
  inspect: (part: DynamicToolUIPart) => void;
};

const ToolInspectorContext = React.createContext<ToolInspectorContextValue | null>(null);

/** Access the tool-detail panel opener. Must be used within {@link ToolInspectorProvider}. */
export function useToolInspector(): ToolInspectorContextValue {
  const context = React.useContext(ToolInspectorContext);
  if (!context) throw new Error("useToolInspector must be used within a ToolInspectorProvider.");
  return context;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  );
}

/** Inset side panel showing one tool call's input/output, within the chat content. */
function ToolDetailPanel({ part, onClose }: { part: DynamicToolUIPart; onClose: () => void }) {
  const t = useTranslations("chat");
  const status = toolStatus(part);

  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l border-border bg-background">
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <span className="truncate font-mono text-xs font-medium">{part.toolName}</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <Section label={t("inputLabel")}>{formatJson(part.input)}</Section>
        <Section label={t("outputLabel")}>
          {part.state === "output-available"
            ? formatJson(part.output)
            : part.state === "output-error"
              ? part.errorText
              : t("running")}
        </Section>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground uppercase">
          <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
          {status === "done" ? t("done") : status === "error" ? t("failed") : t("running")}
        </span>
      </div>
    </aside>
  );
}

/**
 * Holds the selected tool call and renders its detail as an inset panel beside
 * the chat content (a flex sibling, not an overlay). `children` is the chat
 * column and shrinks when the panel opens.
 */
export function ToolInspectorProvider({ children }: { children: React.ReactNode }) {
  const [part, setPart] = React.useState<DynamicToolUIPart | null>(null);
  const value = React.useMemo<ToolInspectorContextValue>(() => ({ inspect: setPart }), []);

  return (
    <ToolInspectorContext.Provider value={value}>
      <div className="flex h-full w-full">
        {children}
        {part ? <ToolDetailPanel part={part} onClose={() => setPart(null)} /> : null}
      </div>
    </ToolInspectorContext.Provider>
  );
}
