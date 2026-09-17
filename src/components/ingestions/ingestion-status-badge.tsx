"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IngestionStatus } from "@clinia/context-engine-js";

/**
 * Colour carries the status; the label repeats it in words, so the dot is
 * decoration rather than the only signal. `processing` pulses because it is the
 * one state that resolves on its own.
 */
const DOT: Record<IngestionStatus, string> = {
  pending: "bg-muted-foreground",
  processing: "bg-primary animate-pulse",
  succeeded: "bg-success",
  partial: "bg-warning",
  failed: "bg-destructive",
};

export function IngestionStatusBadge({
  status,
  className,
}: {
  status: IngestionStatus;
  className?: string;
}) {
  const t = useTranslations("ingestions.status");

  return (
    <Badge variant="outline" className={className}>
      <span className={cn("size-1.5 rounded-full", DOT[status])} aria-hidden />
      {t(status)}
    </Badge>
  );
}
