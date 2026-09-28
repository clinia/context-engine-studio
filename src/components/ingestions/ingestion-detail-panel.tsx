"use client";

import { useTranslations } from "next-intl";

import { formatAbsolute, formatDuration, formatRelative } from "@/components/ingestions/format";
import { IngestionStatusBadge } from "@/components/ingestions/ingestion-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Ingestion, IngestionIntake } from "@clinia/context-engine-js";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type IntakeUnit = IngestionIntake[number];
type IntakeEntry = IntakeUnit["entries"][number];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** `ignored` is the only outcome worth colouring — the content did not land. */
function IntakeEntryRow({ entry }: { entry: IntakeEntry }) {
  const t = useTranslations("ingestions");

  return (
    <li className="flex items-baseline gap-2 py-1.5 text-sm">
      <span className="min-w-0 flex-1 truncate">
        {entry.label ? `${entry.kind} · ${entry.label}` : entry.kind}
      </span>
      <Badge variant={entry.outcome === "ignored" ? "destructive" : "muted"}>
        {entry.reason ? t(`intakeReason.${entry.reason}`) : t(`intakeOutcome.${entry.outcome}`)}
      </Badge>
      <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
        {entry.count}
      </span>
    </li>
  );
}

/**
 * Everything the list already carries about one submission, in the order a
 * failure is diagnosed: what it is, whether it landed, why not, and what came
 * out of it.
 */
export function IngestionDetailPanel({
  ingestion,
  onClose,
  now,
}: {
  ingestion: Ingestion;
  onClose: () => void;
  now: number;
}) {
  const t = useTranslations("ingestions");
  const duration = formatDuration(ingestion.startedAt, ingestion.completedAt);
  const { staged, intake, failure } = ingestion;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <IngestionStatusBadge status={ingestion.status} />
          <p className="truncate font-mono text-xs text-muted-foreground">
            {ingestion.ingestionId}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("closeDetail")}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <dl className="space-y-2">
          <Field label={t("detailSource")}>
            <span className="font-mono text-xs">{ingestion.source}</span>
          </Field>
          <Field label={t("detailMimeType")}>
            <span className="font-mono text-xs">{ingestion.mimeType}</span>
          </Field>
          <Field label={t("detailReceived")}>
            {formatAbsolute(ingestion.receivedAt)}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {formatRelative(ingestion.receivedAt, now)}
            </span>
          </Field>
          <Field label={t("detailStarted")}>
            {ingestion.startedAt ? (
              formatAbsolute(ingestion.startedAt)
            ) : (
              <span className="text-muted-foreground">{t("detailNotStarted")}</span>
            )}
          </Field>
          <Field label={t("detailCompleted")}>
            {ingestion.completedAt ? (
              formatAbsolute(ingestion.completedAt)
            ) : (
              <span className="text-muted-foreground">
                {ingestion.startedAt ? t("detailStillRunning") : "—"}
              </span>
            )}
          </Field>
          {duration && <Field label={t("detailDuration")}>{duration}</Field>}
        </dl>

        {failure && (
          <Section title={t("detailFailure")}>
            <div className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <p className="font-mono text-xs text-destructive">{failure.code}</p>
              <p className="text-sm">{failure.message}</p>
            </div>
          </Section>
        )}

        <Section title={t("detailStaged")}>
          <dl className="grid grid-cols-3 gap-2">
            {(["facts", "events", "narratives"] as const).map((kind) => (
              <div key={kind} className="rounded-xl border border-border px-3 py-2">
                <dt className="text-xs text-muted-foreground">{t(`staged.${kind}`)}</dt>
                <dd className="text-lg tabular-nums">{staged[kind]}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {intake === undefined ? (
          <Section title={t("detailIntake")}>
            <p className="text-sm text-muted-foreground">{t("detailIntakeMissing")}</p>
          </Section>
        ) : (
          intake.map((unit, index) => (
            <Section
              key={`${unit.unit}-${index}`}
              title={t("detailIntakeUnit", {
                unit: t(`intakeUnit.${unit.unit}`),
                count: unit.received,
              })}
            >
              {unit.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("detailIntakeEmpty")}</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {unit.entries.map((entry, entryIndex) => (
                    <IntakeEntryRow
                      key={`${entry.kind}-${entry.outcome}-${entryIndex}`}
                      entry={entry}
                    />
                  ))}
                </ul>
              )}
            </Section>
          ))
        )}
      </div>
    </div>
  );
}
