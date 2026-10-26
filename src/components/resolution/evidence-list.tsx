"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { useFormatIdentity } from "@/components/resolution/identity";
import { CodeText } from "@/components/resolution/record-detail";
import type { LayerEvidence } from "@/lib/context-engine-client/graph-payloads";
import { percent } from "@/lib/resolution/format";
import { cn } from "@/lib/utils";

/** One evidence line, in the field-conflict layout: what was compared, then what it means. */
function Row({ children, meta }: { children?: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
      {children && <span className="min-w-0 break-words">{children}</span>}
      {meta && <span className="text-muted-foreground">{meta}</span>}
    </p>
  );
}

/** The two values a layer compared, side by side; a missing one reads as a dash. */
function Compared({ a, b, same }: { a: string | null; b: string | null; same?: boolean }) {
  return (
    <span className="font-mono">
      {a ?? "—"}
      <span className="text-muted-foreground">{same ? " = " : " ↔ "}</span>
      {b ?? "—"}
    </span>
  );
}

/** A model's reasoning, clamped to two lines until clicked. */
export function Reasoning({ text }: { text: string }) {
  const t = useTranslations("resolution.evidence");
  const [open, setOpen] = React.useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      title={open ? undefined : t("showReasoning")}
      className={cn(
        "block w-full cursor-pointer text-left text-xs text-muted-foreground italic",
        !open && "line-clamp-2",
      )}
    >
      {text}
    </button>
  );
}

type ConceptIdentitySide = Extract<LayerEvidence, { kind: "concept-identity-match" }>["a"];

function conceptIds({ members }: ConceptIdentitySide): string {
  return members.map(({ conceptId }) => conceptId).join(", ");
}

/** How the adjudicator settled each field it found the two records disagreeing on. */
function LlmConflicts({
  conflicts,
}: {
  conflicts: Extract<LayerEvidence, { canonical: "merged" }>["conflicts"];
}) {
  const t = useTranslations("resolution.evidence");
  if (conflicts.length === 0) return null;

  return (
    <ul className="space-y-1">
      {conflicts.map((conflict, index) => (
        <li key={`${conflict.field}-${index}`} className="grid grid-cols-[6rem_1fr] gap-2 text-xs">
          <span className="truncate text-muted-foreground" title={conflict.field}>
            {conflict.field}
          </span>
          <span className="min-w-0 break-words">
            {String(conflict.resolution ?? "—")}
            <span className="text-muted-foreground">
              {" "}
              {t("viaStrategy", { strategy: conflict.strategy })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One piece of evidence as a line or two: the values compared, then what they show. */
function EvidenceBody({ evidence }: { evidence: LayerEvidence }) {
  const t = useTranslations("resolution.evidence");
  const formatIdentity = useFormatIdentity();

  switch (evidence.kind) {
    case "source-ref":
      return <Row meta={t("sourceRef")} />;

    case "exact-code-match":
      return (
        <Row meta={t("exactCode")}>
          <CodeText system={evidence.system} code={evidence.code} />
        </Row>
      );

    case "hierarchical-code-match":
      return (
        <Row
          meta={
            <>
              {t("hierarchicalCode")}{" "}
              <CodeText system={evidence.system} code={evidence.ancestorCode} />
            </>
          }
        >
          <Compared a={evidence.codeA} b={evidence.codeB} />
        </Row>
      );

    case "code-mismatch":
      return (
        <Row meta={t("codeMismatch")}>
          <CodeText system={evidence.system} code={`${evidence.codeA} ≠ ${evidence.codeB}`} />
        </Row>
      );

    case "concept-identity-match":
    case "concept-identity-partial-match":
    case "concept-identity-mismatch":
      return (
        <Row meta={t(`conceptIdentity.${evidence.kind}`, { rung: evidence.a.rung })}>
          <Compared
            a={conceptIds(evidence.a)}
            b={conceptIds(evidence.b)}
            same={evidence.kind === "concept-identity-match"}
          />
        </Row>
      );

    case "medication-identity-match":
    case "medication-identity-mismatch":
    case "medication-identity-incomplete":
      return (
        <Row meta={t(`identity.${evidence.kind}`)}>
          <Compared
            a={formatIdentity(evidence.a)}
            b={formatIdentity(evidence.b)}
            same={evidence.kind === "medication-identity-match"}
          />
        </Row>
      );

    case "field-similarity":
      return (
        <Row
          meta={t("fieldSimilarity", {
            field: evidence.field,
            score: percent(evidence.similarity),
          })}
        >
          <Compared
            a={evidence.aValue}
            b={evidence.bValue}
            same={evidence.aValue !== null && evidence.aValue === evidence.bValue}
          />
        </Row>
      );

    case "semantic-similarity":
    case "narrative-semantic-similarity":
      return (
        <Row meta={t("semanticSimilarity", { score: percent(evidence.measurement.similarity) })} />
      );

    case "llm":
      return (
        <div className="space-y-1">
          <Row
            meta={[
              t("llmConfidence", { score: percent(evidence.confidence) }),
              evidence.match ? t(`llmCanonical.${evidence.canonical}`) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            {evidence.match ? t("llmMatch") : t("llmNoMatch")}
          </Row>
          <Reasoning text={evidence.reasoning} />
          {evidence.match && evidence.canonical === "merged" && (
            <LlmConflicts conflicts={evidence.conflicts} />
          )}
        </div>
      );

    case "narrative-llm":
      return <Reasoning text={evidence.reasoning} />;
  }
}

/** Consecutive entries from the same layer, so the layer is named once above them. */
function byLayerRun(evidence: LayerEvidence[]): { layer: string; items: LayerEvidence[] }[] {
  const runs: { layer: string; items: LayerEvidence[] }[] = [];
  for (const item of evidence) {
    const last = runs.at(-1);
    if (last?.layer === item.layer) last.items.push(item);
    else runs.push({ layer: item.layer, items: [item] });
  }
  return runs;
}

/**
 * The evidence one decision was reached on, in the order the layers produced it, so the
 * list reads as the path the cascade took, cheap checks first. `showLayer` names each run
 * of entries from one layer above it.
 */
export function EvidenceList({
  evidence,
  showLayer = true,
}: {
  evidence: LayerEvidence[];
  showLayer?: boolean;
}) {
  const t = useTranslations("resolution.evidence");

  if (evidence.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("none")}</p>;
  }

  return (
    <div className="space-y-2">
      {byLayerRun(evidence).map((run, runIndex) => (
        <div key={`${run.layer}-${runIndex}`} className="space-y-1">
          {showLayer && (
            <p className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
              {run.layer}
            </p>
          )}
          {run.items.map((item, index) => (
            <EvidenceBody key={`${item.kind}-${index}`} evidence={item} />
          ))}
        </div>
      ))}
    </div>
  );
}
