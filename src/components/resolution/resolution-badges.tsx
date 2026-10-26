"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { ResolutionLevel } from "@/lib/context-engine-client/graph-payloads";
import { cn } from "@/lib/utils";

/**
 * How strongly the evidence supported the verdict, on the same outline-plus-dot pattern
 * the ingestion status badge uses.
 */
export const LEVEL_DOT: Record<ResolutionLevel, string> = {
  confirmed: "bg-level-confirmed",
  probable: "bg-level-probable",
  uncertain: "bg-level-uncertain",
};

/** Reads "Confirmed", or "5 confirmed" when given a `count`. */
export function ResolutionLevelBadge({
  resolution,
  count,
  className,
}: {
  resolution: ResolutionLevel;
  count?: number;
  className?: string;
}) {
  const t = useTranslations("resolution");

  return (
    <Badge variant="outline" className={className} title={t(`levelHint.${resolution}`)}>
      <span className={cn("size-1.5 rounded-full", LEVEL_DOT[resolution])} aria-hidden />
      {count === undefined ? t(`level.${resolution}`) : t(`levelCount.${resolution}`, { count })}
    </Badge>
  );
}
