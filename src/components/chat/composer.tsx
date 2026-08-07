"use client";

import * as React from "react";
import { ArrowUp02Icon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  /** True while a response is streaming; swaps send for a stop button. */
  isBusy: boolean;
};

/** Auto-resizing textarea + send/stop control with `Enter` to send. */
export function Composer({ value, onChange, onSubmit, onStop, isBusy }: ComposerProps) {
  const t = useTranslations("chat");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Grow with content up to a cap, then scroll internally.
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim() && !isBusy) onSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-input/30 p-2 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            rows={1}
            className="max-h-[200px] min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          {isBusy ? (
            <Button type="button" size="icon" variant="outline" onClick={onStop}>
              <HugeiconsIcon icon={StopIcon} />
            </Button>
          ) : (
            <Button type="button" size="icon" disabled={!value.trim()} onClick={onSubmit}>
              <HugeiconsIcon icon={ArrowUp02Icon} />
            </Button>
          )}
        </div>
        <p className="mt-2 px-2 text-right font-mono text-[10px] text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5">Enter</kbd>{" "}
          {t("sendHint")}
        </p>
      </div>
    </div>
  );
}
