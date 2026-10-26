"use client";

import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";

import { Disclosure } from "@/components/resolution/disclosure";
import { Reasoning } from "@/components/resolution/evidence-list";
import {
  isExactStep,
  scoreOf,
  STEPS,
  type MergeLink,
  type MergeReasoning,
  type Step,
} from "@/lib/resolution/merge-reasoning";
import { formatCodeSystem, SourceTag, type Records } from "@/components/resolution/record-detail";
import { ResolutionLevelBadge } from "@/components/resolution/resolution-badges";
import { useExplainRule } from "@/components/resolution/rule-explanation";
import { Badge } from "@/components/ui/badge";
import type { FieldVerdict } from "@/lib/context-engine-client/graph-payloads";
import { formatFieldValue, percent } from "@/lib/resolution/format";
import { RESOLUTION_LEVELS } from "@/lib/resolution/levels";
import { cn } from "@/lib/utils";

/** The check's fill on the ramp from exact (green) to judged (magenta). */
export const STEP_FILL: Record<Step, string> = {
  source: "bg-step-source text-on-step",
  identity: "bg-step-identity text-on-step",
  code: "bg-step-code text-on-step",
  wording: "bg-step-wording text-on-step",
  meaning: "bg-step-meaning text-on-step",
  model: "bg-step-model text-on-step",
};

/** More than half the matches rest on a model check. */
function isModelHeavy(reasoning: MergeReasoning): boolean {
  return reasoning.links.length > 0 && reasoning.byStep.model * 2 > reasoning.links.length;
}

/** The steps that matched at least one record, in cascade order. */
function stepsUsed(reasoning: MergeReasoning): Step[] {
  return STEPS.filter((step) => reasoning.byStep[step] > 0);
}

/**
 * What held the records together, counted the way the ladder counts: one match per record.
 *
 * - Names the shared code when every code match used the same one.
 * - Matches on a rule outside the ladder are counted as judged, as other checks.
 * - Renders nothing when no merge links the records; the card's unlinked line says it instead.
 */
function Verdict({ reasoning, count }: { reasoning: MergeReasoning; count: number }) {
  const t = useTranslations("resolution.reasoning");
  const format = useFormatter();
  const used = stepsUsed(reasoning);
  const exactSteps = used.filter(isExactStep);
  const judgedSteps = used.filter((step) => !isExactStep(step));
  const total = reasoning.links.length;
  const exactCount = exactSteps.reduce((sum, step) => sum + reasoning.byStep[step], 0);
  const otherCount = reasoning.links.filter((link) => link.step === null).length;
  const relatedCodes = reasoning.links.some(
    (link) => link.decision.decision.ruleId === "deterministic-code-hierarchical",
  );
  const { sharedCode } = reasoning;

  const mono = (chunks: React.ReactNode) => (
    <span className="rounded bg-muted px-1 font-mono text-[0.8125rem]">{chunks}</span>
  );
  const exact = () =>
    format.list(
      exactSteps.map((step) => (
        <React.Fragment key={step}>
          {step === "code" && sharedCode
            ? t.rich("stepExact.codeShared", {
                code: `${formatCodeSystem(sharedCode.system)} ${sharedCode.code}`,
                mono,
              })
            : step === "code" && relatedCodes
              ? t("stepExact.codeRelated")
              : t(`stepExact.${step}`)}
        </React.Fragment>
      )),
      { type: "disjunction" },
    );
  const checks = format.list(
    [
      ...judgedSteps.map((step) => t(`stepJoined.${step}`, { count: reasoning.byStep[step] })),
      ...(otherCount > 0 ? [t("stepJoined.other", { count: otherCount })] : []),
    ],
    { type: "conjunction" },
  );

  if (total === 0) {
    return null;
  }

  if (reasoning.unlinkedIds.length === 0 && exactCount === total) {
    return <p className="text-[0.9375rem] leading-snug">{t.rich("allExact", { count, exact })}</p>;
  }

  if (count === 2 && total === 1) {
    return (
      <p className="text-[0.9375rem] leading-snug">
        {t("pairJudged", { checks })}
        {isModelHeavy(reasoning) && <> {t("pairModel")}</>}
      </p>
    );
  }

  return (
    <p className="text-[0.9375rem] leading-snug">
      {reasoning.unlinkedIds.length === 0 && <>{t("eachMatches", { count })} </>}
      {exactCount === total
        ? t.rich("everyExact", { exact })
        : exactCount > 0
          ? t.rich("someExact", { exactCount, judged: total - exactCount, checks, exact })
          : t("noneExact", { checks })}
      {isModelHeavy(reasoning) && <> {t("modelHeavy")}</>}
    </p>
  );
}

/** How many records joined at each check that matched any, in cascade order; the weakest link's step is ringed. */
function StepLadder({ reasoning }: { reasoning: MergeReasoning }) {
  const t = useTranslations("resolution.reasoning");
  const steps = stepsUsed(reasoning);
  const columns = steps.map((step) => `minmax(3.25rem, ${reasoning.byStep[step]}fr)`).join(" ");

  return (
    <div className="space-y-1">
      <div className="grid h-7 gap-0.5" style={{ gridTemplateColumns: columns }}>
        {steps.map((step, index) => (
          <div
            key={step}
            title={t(`step.${step}`)}
            className={cn(
              "flex items-center justify-center rounded-sm text-xs font-semibold tabular-nums",
              STEP_FILL[step],
              index === 0 && "rounded-l-lg",
              index === steps.length - 1 && "rounded-r-lg",
              reasoning.weakest?.step === step &&
                "ring-2 ring-accent ring-offset-1 ring-offset-card",
            )}
          >
            {reasoning.byStep[step]}
          </div>
        ))}
      </div>
      <div
        className="grid gap-0.5 text-center text-[0.6875rem] text-muted-foreground"
        style={{ gridTemplateColumns: columns }}
      >
        {steps.map((step) => (
          <span key={step} className="truncate">
            {t(`step.${step}`)}
          </span>
        ))}
      </div>
      {steps.some(isExactStep) && !steps.every(isExactStep) && (
        <div className="flex items-center gap-2 text-[0.6875rem] text-muted-foreground">
          <span>{t("scaleExact")}</span>
          <span className="flex-1 border-t border-dashed border-border" />
          <span>{t("scaleJudged")}</span>
        </div>
      )}
    </div>
  );
}

/**
 * The plain answer to "why is this one fact": a sentence, the checks each record joined
 * on, and how strong those links were.
 */
export function VerdictCard({ reasoning, count }: { reasoning: MergeReasoning; count: number }) {
  const t = useTranslations("resolution.reasoning");
  const levels = RESOLUTION_LEVELS.filter((level) => reasoning.levels[level]);

  return (
    <div
      className={cn(
        "space-y-3.5 rounded-xl border px-3.5 py-3",
        isModelHeavy(reasoning) ? "border-caution" : "border-border",
      )}
    >
      <Verdict reasoning={reasoning} count={count} />
      {reasoning.links.length > 0 && <StepLadder reasoning={reasoning} />}
      {levels.some((level) => level !== "confirmed") && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {levels.map((level) => (
            <ResolutionLevelBadge key={level} resolution={level} count={reasoning.levels[level]} />
          ))}
          <span>{t("countedOnce")}</span>
        </div>
      )}
      {reasoning.unlinkedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("unlinked", { count: reasoning.unlinkedIds.length })}
        </p>
      )}
    </div>
  );
}

/** How the weakest link was judged, in a phrase. */
function useDescribeLink(): (link: MergeLink) => string {
  const t = useTranslations("resolution.reasoning");
  const explainRule = useExplainRule();

  return (link) => {
    const score = scoreOf(link.decision);
    switch (link.step) {
      case "model":
        return score === null ? t("joinedModel") : t("joinedModelScore", { score: percent(score) });
      case "meaning":
        return score === null
          ? t("joinedMeaning")
          : t("joinedMeaningScore", { score: percent(score) });
      case "wording":
        return t("joinedWording");
      default:
        return explainRule(link.decision.decision.ruleId, "merge");
    }
  };
}

/** The one record an auditor should check first: the link the fact leans on least. */
export function WeakestLink({ link, records }: { link: MergeLink; records: Records }) {
  const describe = useDescribeLink();
  const record = records[link.recordId];
  const llm = link.decision.decision.evidence.find((item) => item.kind === "llm");

  return (
    <div className="space-y-1.5 rounded-xl border border-accent/50 bg-accent/5 px-3.5 py-3">
      <div className="flex items-baseline gap-2">
        <p className="min-w-0 flex-1 text-sm break-words">{record?.display ?? link.recordId}</p>
        <ResolutionLevelBadge resolution={link.decision.decision.resolution} />
      </div>
      <p className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
        <span>{describe(link)}</span>
        <span aria-hidden>·</span>
        <SourceTag id={link.recordId} records={records} />
      </p>
      {llm && <Reasoning text={llm.reasoning} />}
    </div>
  );
}

/** One square per member that held a value, filled for those agreeing with the kept one. */
function AgreementStrip({ agree, total }: { agree: number; total: number }) {
  if (total > 16) {
    return (
      <span className="block h-2.5 w-16 overflow-hidden rounded-sm bg-border" aria-hidden>
        <span className="block h-full bg-match" style={{ width: `${(agree / total) * 100}%` }} />
      </span>
    );
  }
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn("h-2.5 w-1.5 rounded-[1px]", index < agree ? "bg-match" : "bg-border")}
        />
      ))}
    </span>
  );
}

/** Every member's value for one field: the kept one first, then each dissent. */
function FieldVerdictValues({
  verdict,
  value,
  records,
}: {
  verdict: FieldVerdict;
  value: unknown;
  records: Records;
}) {
  const t = useTranslations("resolution");

  return (
    <ul className="space-y-1 pl-4">
      <li className="flex items-baseline gap-2 text-xs">
        <span className="min-w-0 flex-1 font-mono break-words">{formatFieldValue(value)}</span>
        <SourceTag id={verdict.picked.extractedFactId} records={records} />
        <Badge variant="secondary">{t("conflictKept")}</Badge>
      </li>
      {verdict.conflict.map((candidate) => (
        <li key={candidate.extractedFactId} className="flex items-baseline gap-2 text-xs">
          <span className="min-w-0 flex-1 font-mono break-words text-muted-foreground line-through">
            {formatFieldValue(candidate.value)}
          </span>
          <SourceTag id={candidate.extractedFactId} records={records} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The fields the members disagreed on, one line each: the value the fact kept, what it won
 * over, and how many members agreed. Each line opens into every member's value.
 */
export function Disagreements({
  conflicts,
  values,
  records,
}: {
  conflicts: [field: string, verdict: FieldVerdict][];
  values: Record<string, unknown>;
  records: Records;
}) {
  const t = useTranslations("resolution.reasoning");

  return (
    <div className="divide-y divide-border/60 rounded-xl border border-border">
      {conflicts.map(([field, verdict]) => {
        const agree = 1 + verdict.agreed.length;
        const total = agree + verdict.conflict.length;
        const others = [...new Set(verdict.conflict.map(({ value }) => formatFieldValue(value)))];

        return (
          <div key={field} className="px-3.5 py-2.5">
            <Disclosure
              className="gap-2.5 text-foreground"
              summary={
                <span className="grid min-w-0 flex-1 grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2.5">
                  <span className="truncate text-muted-foreground" title={field}>
                    {field}
                  </span>
                  <span className="min-w-0 truncate">
                    <span className="font-mono">{formatFieldValue(values[field])}</span>{" "}
                    <span className="text-muted-foreground">
                      {others.length === 1
                        ? t("over", { value: others[0] })
                        : t("overMany", { count: others.length })}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                    <AgreementStrip agree={agree} total={total} />
                    {t("agreeCount", { agree, total })}
                  </span>
                </span>
              }
            >
              <FieldVerdictValues verdict={verdict} value={values[field]} records={records} />
            </Disclosure>
          </div>
        );
      })}
    </div>
  );
}
