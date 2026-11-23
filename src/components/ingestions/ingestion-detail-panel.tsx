"use client";

import { useTranslations } from "next-intl";

import { formatByteLimit, formatDuration, formatPageRanges } from "@/components/ingestions/format";
import { formatAbsolute, formatRelative } from "@/lib/format-date";
import { IngestionStatusBadge } from "@/components/ingestions/ingestion-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Ingestion, IngestionIntake } from "@clinia/context-engine-js";
import { CloseIcon } from "@/components/ui/icons/close";

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

/** `name`, when given, leads the heading in its own case: a file's name as uploaded. */
function Section({
  title,
  name,
  children,
}: {
  title: string;
  name?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-baseline gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {name && (
          <span
            className="min-w-0 truncate text-sm tracking-normal text-foreground normal-case"
            title={name}
          >
            {name}
          </span>
        )}
        <span className="shrink-0">{title}</span>
      </h3>
      {children}
    </section>
  );
}

/**
 * `ignored` is the only outcome worth colouring — the content did not land. An ignored page
 * entry is named by its pages (`page · 1–3, 5`), which is what a reader goes back to the file for;
 * an entry over a limit, by the limit (`application/pdf · max 40 pages`).
 */
function IntakeEntryRow({ entry }: { entry: IntakeEntry }) {
  const t = useTranslations("ingestions");

  const detail = entry.pageNumbers
    ? formatPageRanges(entry.pageNumbers)
    : entry.limit
      ? t(`intakeLimit.${entry.limit.name}`, {
          value:
            entry.limit.name === "file_bytes"
              ? formatByteLimit(entry.limit.value)
              : entry.limit.value,
        })
      : entry.label;
  const label = detail ? `${entry.kind} · ${detail}` : entry.kind;

  return (
    <li className="flex items-baseline gap-2 py-1.5 text-sm">
      <span className="min-w-0 flex-1 truncate" title={label}>
        {label}
      </span>
      <Badge variant={entry.outcome === "ignored" ? "destructive" : "secondary"}>
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
          <CloseIcon />
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
            <Alert variant="destructive" role="note">
              <AlertTitle className="font-mono text-xs font-normal">{failure.code}</AlertTitle>
              <AlertDescription className="text-foreground">{failure.message}</AlertDescription>
            </Alert>
          </Section>
        )}

        <Section title={t("detailStaged")}>
          <dl className="grid grid-cols-3 gap-2">
            {(["facts", "events", "narratives"] as const).map((kind) => (
              <div key={kind} className="rounded-lg border border-border bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">{t(`staged.${kind}`)}</dt>
                <dd className="text-body-m tabular-nums">{staged[kind]}</dd>
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
              name={unit.filename}
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
