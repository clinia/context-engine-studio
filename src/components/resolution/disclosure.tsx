"use client";

import * as React from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** A disclosure whose closed state is a whole summary line. */
export function Disclosure({
  summary,
  children,
  className,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger
        className={cn(
          "flex w-full cursor-pointer items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground [&>svg]:transition-transform [&[data-panel-open]>svg]:rotate-90",
          className,
        )}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3 shrink-0" />
        {summary}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}
