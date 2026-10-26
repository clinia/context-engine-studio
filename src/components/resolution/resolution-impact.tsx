"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ResolutionImpact as Impact } from "@/lib/context-engine-client/actions";

function Cell({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger
            aria-label={hint}
            className="rounded-full text-muted-foreground/70 outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      </dt>
      <dd className={emphasis ? "text-lg tabular-nums" : "text-lg tabular-nums text-foreground"}>
        {value}
      </dd>
    </div>
  );
}

/**
 * What resolution did to this patient's records, in five numbers. `merges` and `rejects`
 * are decision counts: a fact of three members is two merges.
 */
export function ResolutionImpact({ impact }: { impact: Impact }) {
  const t = useTranslations("resolution.impact");
  const format = new Intl.NumberFormat();

  // An empty graph shows "—".
  const collapse =
    impact.extracted === 0
      ? "—"
      : `${Math.round(((impact.extracted - impact.facts) / impact.extracted) * 100)}%`;

  return (
    <dl className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3 sm:grid-cols-5">
      <Cell
        label={t("extracted")}
        value={format.format(impact.extracted)}
        hint={t("extractedHint")}
      />
      <Cell label={t("facts")} value={format.format(impact.facts)} hint={t("factsHint")} />
      <Cell label={t("collapse")} value={collapse} hint={t("collapseHint")} emphasis />
      <Cell label={t("merges")} value={format.format(impact.merges)} hint={t("mergesHint")} />
      <Cell label={t("rejects")} value={format.format(impact.rejects)} hint={t("rejectsHint")} />
    </dl>
  );
}
