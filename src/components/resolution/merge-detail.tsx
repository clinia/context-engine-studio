"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Disclosure } from "@/components/resolution/disclosure";
import { EvidenceList } from "@/components/resolution/evidence-list";
import { useFormatIdentity } from "@/components/resolution/identity";
import { STEP_FILL } from "@/components/resolution/merge-summary";
import { formatCodeSystem, SourceTag, type Records } from "@/components/resolution/record-detail";
import { LEVEL_DOT } from "@/components/resolution/resolution-badges";
import { useExplainRule } from "@/components/resolution/rule-explanation";
import type { FieldVerdict } from "@/lib/context-engine-client/graph-payloads";
import { fieldMatrix, type FieldSimilarity } from "@/lib/resolution/field-matrix";
import { formatFieldValue, percent } from "@/lib/resolution/format";
import {
  scoreOf,
  STEPS,
  trailOf,
  type MergeLink,
  type MergeReasoning,
  type Step,
  type TrailStatus,
} from "@/lib/resolution/merge-reasoning";
import { cn } from "@/lib/utils";

/** `#n`, the record's place in the reasoning's reading order. */
function useRecordNumbers(reasoning: MergeReasoning): Map<string, number> {
  return React.useMemo(
    () => new Map(reasoning.order.map((id, index) => [id, index + 1])),
    [reasoning],
  );
}

function RecordNumber({ n }: { n: number | undefined }) {
  return (
    <span className="w-6 shrink-0 font-mono text-[0.6875rem] text-muted-foreground">
      #{n ?? "?"}
    </span>
  );
}

/** What the deciding check found, in a few words. */
function useLinkPhrase(): (link: MergeLink) => string {
  const t = useTranslations("resolution.reasoning");
  const explainRule = useExplainRule();
  const formatIdentity = useFormatIdentity();

  return (link) => {
    const evidence = link.decision.decision.evidence;
    const score = scoreOf(link.decision);
    switch (link.step) {
      case "source":
        return t("phraseSource");
      case "identity": {
        const match = evidence.find((item) => item.kind === "medication-identity-match");
        if (match) return formatIdentity(match.a);
        return explainRule(link.decision.decision.ruleId, "merge");
      }
      case "code": {
        const exact = evidence.find((item) => item.kind === "exact-code-match");
        if (exact) return `${formatCodeSystem(exact.system)} ${exact.code}`;
        const hierarchical = evidence.find((item) => item.kind === "hierarchical-code-match");
        if (hierarchical) {
          return t("phraseHierarchical", {
            ancestor: `${formatCodeSystem(hierarchical.system)} ${hierarchical.ancestorCode}`,
          });
        }
        return t("phraseConcept");
      }
      case "wording":
        return score === null ? t("joinedWording") : t("phraseWording", { score: percent(score) });
      case "meaning":
        return score === null ? t("joinedMeaning") : t("phraseMeaning", { score: percent(score) });
      case "model":
        return score === null ? t("joinedModel") : t("phraseModel", { score: percent(score) });
      default:
        return explainRule(link.decision.decision.ruleId, "merge");
    }
  };
}

const TRAIL_DOT: Record<TrailStatus, string> = {
  decided: "",
  passed: "border-[1.5px] border-muted-foreground/60",
  skipped: "border-[1.5px] border-muted-foreground/30",
};

/** Each check this link went through in order with what it did, and the evidence it recorded. */
function Trail({ link }: { link: MergeLink }) {
  const t = useTranslations("resolution.reasoning");

  return (
    <ol className="space-y-2 pl-1">
      {trailOf(link.decision).map(({ step, status, evidence }) => (
        <li key={step} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2">
          <span
            className={cn(
              "mt-1 size-2.5 rounded-full",
              status === "decided" ? STEP_FILL[step] : TRAIL_DOT[status],
            )}
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className={cn("text-foreground", status === "decided" && "font-medium")}>
                {t(`step.${step}`)}
              </span>
              {" · "}
              {t(`trail.${status}`)}
            </p>
            {evidence.length > 0 && <EvidenceList evidence={evidence} showLayer={false} />}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One linked record: its wording and what joined it, opening into the full trail. */
function LinkRow({
  link,
  records,
  numbers,
}: {
  link: MergeLink;
  records: Records;
  numbers: Map<string, number>;
}) {
  const t = useTranslations("resolution");
  const phrase = useLinkPhrase();
  const level = link.decision.decision.resolution;

  return (
    <li>
      <Disclosure
        className="items-start gap-2 text-foreground"
        summary={
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <RecordNumber n={numbers.get(link.recordId)} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm break-words">
                {records[link.recordId]?.display ?? link.recordId}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("reasoning.withRecord", { n: numbers.get(link.joinedId) ?? "?" })} ·{" "}
                {phrase(link)}
              </span>
            </span>
            <span
              className={cn("size-1.5 shrink-0 self-center rounded-full", LEVEL_DOT[level])}
              title={t(`level.${level}`)}
            />
          </span>
        }
      >
        <div className="space-y-2 pb-1 pl-8">
          <p className="text-xs">
            <SourceTag id={link.recordId} records={records} />
          </p>
          <Trail link={link} />
        </div>
      </Disclosure>
    </li>
  );
}

function StepHeading({ step, label }: { step: Step | null; label: string }) {
  return (
    <p className="flex items-center gap-2 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
      <span
        className={cn("size-2.5 rounded-[3px]", step ? STEP_FILL[step] : "bg-muted")}
        aria-hidden
      />
      {label}
    </p>
  );
}

/**
 * Each record once, grouped by the check that joined it, strongest first. A record opens
 * into every check its link went through.
 */
export function RecordLinks({
  reasoning,
  records,
}: {
  reasoning: MergeReasoning;
  records: Records;
}) {
  const t = useTranslations("resolution.reasoning");
  const numbers = useRecordNumbers(reasoning);
  const [first] = reasoning.order;
  const groups: { step: Step | null; links: MergeLink[] }[] = [...STEPS, null]
    .map((step) => ({ step, links: reasoning.links.filter((link) => link.step === step) }))
    .filter(({ links }) => links.length > 0);

  return (
    <div className="space-y-4">
      {first !== undefined && (
        <div className="space-y-1.5">
          <StepHeading step={null} label={t("firstRecord")} />
          <p className="flex items-baseline gap-2 pl-5">
            <RecordNumber n={1} />
            <span className="text-sm break-words">{records[first]?.display ?? first}</span>
          </p>
        </div>
      )}
      {groups.map(({ step, links }) => (
        <div key={step ?? "other"} className="space-y-1.5">
          <StepHeading
            step={step}
            label={`${step ? t(`stepGroup.${step}`) : t("stepGroupOther")} · ${links.length}`}
          />
          <ul className="space-y-2">
            {links.map((link) => (
              <LinkRow key={link.recordId} link={link} records={records} numbers={numbers} />
            ))}
          </ul>
        </div>
      ))}
      {reasoning.unlinkedIds.length > 0 && (
        <div className="space-y-1.5">
          <StepHeading step={null} label={t("noLink")} />
          {reasoning.unlinkedIds.map((id) => (
            <p key={id} className="flex items-baseline gap-2 pl-5">
              <RecordNumber n={numbers.get(id)} />
              <span className="text-sm break-words">{records[id]?.display ?? id}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** One wording comparison as a square: filled by similarity, hatched when a side was blank. */
function SimilarityCell({ item }: { item: FieldSimilarity | null }) {
  const t = useTranslations("resolution.reasoning");
  if (!item) return <span className="block h-3.5 w-5 text-center text-muted-foreground">·</span>;

  const missing = item.aValue === null || item.bValue === null;
  const title = `${item.aValue ?? "—"} ↔ ${item.bValue ?? "—"} · ${missing ? t("cellMissing") : percent(item.similarity)}`;
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "block h-3.5 w-5 rounded-[3px]",
        missing
          ? "border border-dashed border-muted-foreground/50"
          : item.similarity >= 0.9
            ? "bg-match"
            : item.similarity >= 0.5
              ? "bg-match-partial"
              : "ring-[1.5px] ring-mismatch ring-inset",
      )}
    />
  );
}

/**
 * The fields against the checks that read them one by one: the wording check per link, what
 * the model settled, and the value the fact kept. Checks that compare whole records have
 * no column.
 */
export function FieldsByCheck({
  reasoning,
  verdicts,
  values,
}: {
  reasoning: MergeReasoning;
  verdicts: Record<string, FieldVerdict>;
  values: Record<string, unknown>;
}) {
  const t = useTranslations("resolution.reasoning");
  const numbers = useRecordNumbers(reasoning);
  const { columns, rows } = React.useMemo(
    () => fieldMatrix(reasoning, verdicts),
    [reasoning, verdicts],
  );
  const hasModel = rows.some((row) => row.settled.length > 0);

  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("fieldsNone")}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("fieldsNote")}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                {t("columnField")}
              </th>
              {columns.length > 0 && (
                <th scope="col" className="px-2 py-2 font-medium">
                  <span className="block">{t("step.wording")}</span>
                  <span className="mt-1 flex gap-1 font-mono text-[0.625rem] font-normal">
                    {columns.map((link) => (
                      <span key={link.recordId} className="w-5">
                        #{numbers.get(link.recordId)}
                      </span>
                    ))}
                  </span>
                </th>
              )}
              {hasModel && (
                <th scope="col" className="px-2 py-2 font-medium">
                  {t("step.model")}
                </th>
              )}
              <th scope="col" className="px-3 py-2 font-medium">
                {t("columnKept")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => {
              const agree = row.verdict ? 1 + row.verdict.agreed.length : null;
              const total =
                row.verdict && agree !== null ? agree + row.verdict.conflict.length : null;
              return (
                <tr key={row.field}>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-muted-foreground">
                    {row.field}
                  </th>
                  {columns.length > 0 && (
                    <td className="px-2 py-2">
                      <span className="flex gap-1">
                        {row.wording.map((item, index) => (
                          <SimilarityCell key={columns[index]?.recordId ?? index} item={item} />
                        ))}
                      </span>
                    </td>
                  )}
                  {hasModel && (
                    <td className="px-2 py-2">
                      {row.settled.length === 0 ? (
                        <span className="text-muted-foreground">·</span>
                      ) : (
                        row.settled.map((item) => (
                          <span key={item.recordId} className="block" title={item.strategy}>
                            <span className="font-mono">{formatFieldValue(item.resolution)}</span>{" "}
                            <span className="text-muted-foreground">
                              #{numbers.get(item.recordId)}
                            </span>
                          </span>
                        ))
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2">
                    {row.verdict ? (
                      <>
                        <span className="font-mono">{formatFieldValue(values[row.field])}</span>{" "}
                        <span
                          className={cn(
                            "tabular-nums",
                            row.verdict.conflict.length > 0
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {agree}/{total}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">·</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-sm bg-match" aria-hidden />
          {t("legendSame")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-sm bg-match-partial" aria-hidden />
          {t("legendPartly")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-3.5 rounded-sm ring-[1.5px] ring-mismatch ring-inset"
            aria-hidden
          />
          {t("legendDifferent")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-3.5 rounded-sm border border-dashed border-muted-foreground/50"
            aria-hidden
          />
          {t("cellMissing")}
        </span>
      </p>
    </div>
  );
}
