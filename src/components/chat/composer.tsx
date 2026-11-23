"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { ArrowUpwardIcon } from "@/components/ui/icons/arrow-upward";
import { StopIcon } from "@/components/ui/icons/stop";

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
        <InputGroup className="items-end">
          <InputGroupTextarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            rows={1}
            className="max-h-[200px] min-h-9"
          />
          <InputGroupAddon align="inline-end" className="pb-2">
            {isBusy ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={onStop}
                aria-label={t("stop")}
              >
                <StopIcon />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon-sm"
                disabled={!value.trim()}
                onClick={onSubmit}
                aria-label={t("send")}
              >
                <ArrowUpwardIcon />
              </Button>
            )}
          </InputGroupAddon>
        </InputGroup>
        <p className="mt-2 px-2 text-right text-body-xs text-muted-foreground">
          <Kbd>Enter</Kbd> {t("sendHint")}
        </p>
      </div>
    </div>
  );
}
