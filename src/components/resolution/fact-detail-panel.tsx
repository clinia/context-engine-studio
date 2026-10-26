"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Disclosure, Section } from "@/components/resolution/disclosure";
import { EvidenceList } from "@/components/resolution/evidence-list";
import { FieldsByCheck, RecordLinks } from "@/components/resolution/merge-detail";
import { Disagreements, VerdictCard, WeakestLink } from "@/components/resolution/merge-summary";
import { RecordDetail, RecordName, type Records } from "@/components/resolution/record-detail";
import { ResolutionLevelBadge } from "@/components/resolution/resolution-badges";
import { useExplainRule } from "@/components/resolution/rule-explanation";
import { Button } from "@/components/ui/button";
import { useActionResult } from "@/hooks/use-action-result";
import {
  readExtractedFacts,
  readFactDecisions,
  type ResolvedFact,
} from "@/lib/context-engine-client/actions";
import { groupByRule, type DecisionGroup } from "@/lib/resolution/decision-groups";
import {
  bySharedEvidence,
  splitEvidence,
  type SharedEvidence as Shared,
} from "@/lib/resolution/evidence";
import { WEAKEST_FIRST } from "@/lib/resolution/levels";
import { deriveMergeReasoning } from "@/lib/resolution/merge-reasoning";
import { groupMembersBySource, type SourceGroup } from "@/lib/resolution/source-groups";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const NO_RECORDS: Records = {};

/**
 * One stop rule's contribution: what it checked, in a sentence, and how many pairs it
 * decided at what support. A few of those decisions open beneath it as examples.
 */
function RuleGroup({ group, records }: { group: DecisionGroup; records: Records }) {
  const t = useTranslations("resolution");
  const explainRule = useExplainRule();

  return (
    <div className="space-y-1.5 rounded-xl border border-border px-3 py-2.5">
      <div className="flex items-baseline gap-2">
        <p className="min-w-0 flex-1 text-sm">{explainRule(group.ruleId, "merge")}</p>
        <span className="shrink-0 text-sm tabular-nums">
          {t("groupPairs", { count: group.count })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">{group.ruleId}</span>
        {WEAKEST_FIRST.filter((level) => group.resolutions[level]).map((level) => (
          <span key={level} className="flex items-center gap-1">
            <ResolutionLevelBadge resolution={level} />
            {group.resolutions[level] !== group.count && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {group.resolutions[level]}
              </span>
            )}
          </span>
        ))}
      </div>

      {group.samples.length > 0 && (
        <Disclosure summary={t("groupSamples", { count: group.samples.length })}>
          <div className="divide-y divide-border/50">
            {bySharedEvidence(group.samples).map((shared) => (
              <SharedEvidence key={shared.samples[0]?.edgeId} shared={shared} records={records} />
            ))}
          </div>
        </Disclosure>
      )}
    </div>
  );
}

/**
 * Evidence a rule decided on, once, above every sampled pair it decided that way. What
 * other layers recorded about a pair opens beneath it; the records in full are in the
 * fact's own record list.
 */
function SharedEvidence({ shared, records }: { shared: Shared; records: Records }) {
  const t = useTranslations("resolution");

  return (
    <div className="space-y-1.5 py-2.5 first:pt-0 last:pb-0">
      <EvidenceList evidence={shared.deciding} showLayer={false} />
      <ul className="space-y-1">
        {shared.samples.map((sample) => {
          const { other } = splitEvidence(sample.decision.ruleId, sample.decision.evidence);
          return (
            <li key={sample.edgeId} className="space-y-1">
              <p className="text-xs break-words">
                <RecordName id={sample.fromId} records={records} />
                <span className="text-muted-foreground">{" ↔ "}</span>
                <RecordName id={sample.toId} records={records} />
              </p>
              {other.length > 0 && (
                <Disclosure summary={t("sampleOtherEvidence", { count: other.length })}>
                  <EvidenceList evidence={other} />
                </Disclosure>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The records one source contributed, as a count that opens into each record in full. */
function SourceGroupBlock({ group, records }: { group: SourceGroup; records: Records }) {
  const t = useTranslations("resolution");

  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="min-w-0 flex-1 font-mono text-xs break-words">
          {group.label ?? t("sourceUnknown")}
        </span>
        <span className="shrink-0 text-sm tabular-nums">
          {t("groupRecords", { count: group.memberIds.length })}
        </span>
      </div>
      <div className="mt-1.5">
        <Disclosure summary={t("showRecords")}>
          <ul className="divide-y divide-border/50">
            {group.memberIds.map((id) => (
              <li key={id} className="py-2 first:pt-0 last:pb-0">
                <RecordDetail record={records[id]} fallbackId={id} />
              </li>
            ))}
          </ul>
        </Disclosure>
      </div>
    </div>
  );
}

/** The merges grouped by rule, or what to say when there are none. */
function DecisionGroupList({
  groups,
  records,
  empty,
}: {
  groups: DecisionGroup[];
  records: Records;
  empty: string;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <RuleGroup key={group.ruleId} group={group} records={records} />
      ))}
    </div>
  );
}

/** One row of the "more detail" list: a label and a count that open into the detail. */
function DetailRow({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3.5 py-3">
      <Disclosure
        className="gap-2.5 text-sm text-foreground"
        summary={
          <>
            <span className="min-w-0 flex-1">{label}</span>
            {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
          </>
        }
      >
        <div className="pt-1.5">{children}</div>
      </Disclosure>
    </div>
  );
}

/**
 * One fact's audit trail: the records it absorbed and the decisions that merged them.
 *
 * The fact node names its members and how they voted on each field; the decisions and the
 * records they name are read from the graph once the panel opens.
 */
export function FactDetailPanel({
  fact,
  registryKey,
  onClose,
}: {
  fact: ResolvedFact;
  registryKey: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("resolution");
  const members = fact.memberIds;
  const loadRecords = React.useMemo(
    () => (registryKey ? () => readExtractedFacts(registryKey, members) : null),
    [registryKey, members],
  );
  const loadDecisions = React.useMemo(
    () => (registryKey ? () => readFactDecisions(registryKey, members) : null),
    [registryKey, members],
  );
  const recordsState = useActionResult(loadRecords);
  const decisionsState = useActionResult(loadDecisions);

  const records = recordsState.status === "loaded" ? recordsState.data : NO_RECORDS;
  const decisions = decisionsState.status === "loaded" ? decisionsState.data : null;

  const sourceGroups = React.useMemo(
    () => groupMembersBySource(members, records),
    [members, records],
  );
  const reasoning = React.useMemo(
    () => (decisions ? deriveMergeReasoning(members, decisions.merges) : null),
    [members, decisions],
  );
  const ruleGroups = React.useMemo(
    () => (decisions ? groupByRule(decisions.merges) : []),
    [decisions],
  );
  const conflicts = React.useMemo(
    () => Object.entries(fact.fieldVerdicts).filter(([, verdict]) => verdict.conflict.length > 0),
    [fact.fieldVerdicts],
  );

  const status =
    decisionsState.status === "loading" || decisionsState.status === "idle" ? (
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
    ) : decisionsState.status === "error" ? (
      <p className="text-sm text-destructive">{decisionsState.error}</p>
    ) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm break-words">{fact.display}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{fact.type}</span>
            {" · "}
            {members.length === 1
              ? t("headlineSingle")
              : t("headlineMerged", { count: members.length })}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("closeDetail")}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {recordsState.status === "error" && (
          <p className="text-xs text-destructive">
            {t("recordsError", { error: recordsState.error })}
          </p>
        )}
        <Section title={t("reasoning.title")}>
          {status}
          {decisions &&
            reasoning &&
            (members.length === 1 ? (
              <p className="text-sm text-muted-foreground">{t("detailNoDecisions")}</p>
            ) : reasoning.links.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("detailNoDecisionsFound")}</p>
            ) : (
              <VerdictCard reasoning={reasoning} count={members.length} />
            ))}
          {decisions?.truncated && (
            <p className="text-xs text-muted-foreground">
              {t("detailDecisionsTruncated", { count: decisions.probed })}
            </p>
          )}
        </Section>

        {reasoning?.weakest && (
          <Section title={t("reasoning.weakestTitle")}>
            <WeakestLink link={reasoning.weakest} records={records} />
          </Section>
        )}

        {conflicts.length > 0 && (
          <Section title={t("reasoning.disagreeTitle", { count: conflicts.length })}>
            <Disagreements conflicts={conflicts} values={fact.fieldValues} records={records} />
          </Section>
        )}

        <Section title={t("reasoning.moreTitle")}>
          <div className="divide-y divide-border/60 rounded-xl border border-border">
            {reasoning && reasoning.links.length > 0 && (
              <>
                <DetailRow
                  label={t("reasoning.linksTitle")}
                  meta={t("reasoning.linksMeta", { count: reasoning.links.length })}
                >
                  <RecordLinks reasoning={reasoning} records={records} />
                </DetailRow>
                <DetailRow label={t("reasoning.fieldsTitle")}>
                  <FieldsByCheck
                    reasoning={reasoning}
                    verdicts={fact.fieldVerdicts}
                    values={fact.fieldValues}
                  />
                </DetailRow>
              </>
            )}
            <DetailRow
              label={t("reasoning.records", {
                records: members.length,
                sources: sourceGroups.length,
              })}
            >
              <div className="space-y-2">
                {sourceGroups.map((group) => (
                  <SourceGroupBlock key={group.label ?? ""} group={group} records={records} />
                ))}
              </div>
            </DetailRow>
            {decisions && decisions.merges.length > 0 && (
              <DetailRow
                label={t("reasoning.everyPair")}
                meta={t("groupPairs", { count: decisions.merges.length })}
              >
                <DecisionGroupList
                  groups={ruleGroups}
                  records={records}
                  empty={t("detailNoDecisionsFound")}
                />
              </DetailRow>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
