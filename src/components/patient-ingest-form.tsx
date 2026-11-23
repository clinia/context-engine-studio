"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  detectFiles,
  planSubmissions,
  type DetectedFile,
  type PlanSubmissionsError,
} from "@/lib/ingest/plan-submissions";
import type { FileKind } from "@/lib/ingest/classify";
import { droppedDirectoryName, readDroppedItems } from "@/lib/ingest/collect";
import {
  ingestCdaR2,
  ingestFhirR4,
  ingestFile,
  upsertPatient,
} from "@/lib/context-engine-client/actions";
import { attempt } from "@/lib/result";
import { ErrorIcon } from "@/components/ui/icons/error";
import { CancelIcon } from "@/components/ui/icons/cancel";
import { CheckIcon } from "@/components/ui/icons/check";
import { CloudUploadIcon } from "@/components/ui/icons/cloud-upload";
import { DeleteIcon } from "@/components/ui/icons/delete";
import { DescriptionIcon } from "@/components/ui/icons/description";

const KIND_LABEL: Record<FileKind, string> = {
  fhir: "FHIR",
  cda: "CDA",
  file: "PDF / image",
  unsupported: "Skipped",
};

// One call carries one file, so this bounds each file. Kept under
// `serverActions.bodySizeLimit` in next.config.ts, with margin for encoding.
const MAX_SUBMISSION_BYTES = 20 * 1024 * 1024;

/** Which call the form is waiting on, and whether it extracts a PDF's or image's text. */
type Progress = { extracting: string | null; current: number; total: number };

/** What became of one file: sent, or not ingested for `reason`, with the server's `detail`. */
type FileOutcome = { ok: true } | { ok: false; reason: string; detail?: string };

/** A folder that went in only in part, held on screen until the user continues. */
type PartialResult = { patientId: string; accepted: number };

/** Derives a patient id from the common top-level folder of a directory selection. */
function folderNameFromInput(files: File[]): string | null {
  const relativePath = (files[0] as File & { webkitRelativePath?: string })?.webkitRelativePath;
  return relativePath ? (relativePath.split("/")[0] ?? null) : null;
}

/**
 * Creates a patient and sends a folder's files, then calls {@link onSuccess} with the
 * patient's id and how many files the server accepted.
 *
 * - A PDF or image that is not ingested does not stop the other files. A FHIR or CDA file
 *   the server refuses stops the files after it, which are marked not sent.
 * - Each row is marked with a tick or a cross and the reason, keyed by its `File`.
 * - When some files went in and others did not, the form stays locked until the user
 *   continues. {@link onLockedChange} reports the lock, so a dialog can stay open meanwhile.
 * - A PDF or image the server kept a receipt for gets a tick, even when no text was read
 *   from it. The receipt says why.
 * - It fails, unlocked, only when no file went in.
 */
export function PatientIngestForm({
  onSuccess,
  onLockedChange,
}: {
  onSuccess: (patientId: string, accepted: number) => void;
  onLockedChange?: (locked: boolean) => void;
}) {
  const t = useTranslations("patientIngest");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [patientId, setPatientId] = React.useState("");
  const [files, setFiles] = React.useState<DetectedFile[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isIngesting, setIsIngesting] = React.useState(false);
  const [progress, setProgress] = React.useState<Progress | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [invalid, setInvalid] = React.useState<{ patientId?: boolean; files?: boolean }>({});
  const idRef = React.useRef<HTMLInputElement>(null);
  const [outcomes, setOutcomes] = React.useState<ReadonlyMap<File, FileOutcome>>(new Map());
  const [partial, setPartial] = React.useState<PartialResult | null>(null);
  // Set by the first Continue, so a double-click reports the folder once.
  const continued = React.useRef(false);
  const locked = isIngesting || partial !== null;

  React.useEffect(() => {
    onLockedChange?.(locked);
  }, [locked, onLockedChange]);

  // `webkitdirectory` is not a React prop, so it must be set on the DOM node.
  React.useEffect(() => {
    inputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  // A file no endpoint takes, such as a `.docx`, is skipped and marked in the list.
  const skipped = files.filter(({ kind }) => kind === "unsupported").length;
  const submittable = files.length - skipped;

  const adoptFiles = React.useCallback((collected: File[], derivedId: string | null) => {
    if (collected.length === 0) return;
    setError(null);
    setOutcomes(new Map());
    const detected = detectFiles(collected);
    setFiles(detected);
    if (derivedId) setPatientId((current) => current || derivedId);
    setInvalid((current) => ({
      patientId: current.patientId && !derivedId,
      files: current.files && detected.every(({ kind }) => kind === "unsupported"),
    }));
  }, []);

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    if (locked) return;
    const derivedId = droppedDirectoryName(event.dataTransfer.items);
    const collected = await readDroppedItems(event.dataTransfer.items);
    adoptFiles(collected, derivedId);
  };

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const collected = event.target.files ? Array.from(event.target.files) : [];
    adoptFiles(collected, folderNameFromInput(collected));
  };

  const planErrorReason = (planError: PlanSubmissionsError): string => {
    switch (planError.reason) {
      case "unreadable":
        return t("outcome.unreadable");
      case "invalidJson":
        return t("outcome.invalidJson");
      case "notFhir":
        return t("outcome.notFhir");
      case "tooLarge":
        return t("outcome.tooLarge");
    }
  };

  const planErrorMessage = (planError: PlanSubmissionsError): string => {
    const values = { name: planError.name };
    switch (planError.reason) {
      case "unreadable":
        return t("errors.unreadable", values);
      case "invalidJson":
        return t("errors.invalidJson", values);
      case "notFhir":
        return t("errors.notFhir", values);
      case "tooLarge":
        return t("errors.fileTooLarge", values);
    }
  };

  const submit = async () => {
    const id = patientId.trim();
    if (locked) return;
    // Every field is checked on submit, and focus moves to the first one that fails.
    const missing = { patientId: !id, files: submittable === 0 };
    setInvalid(missing);
    if (missing.patientId) return idRef.current?.focus();
    if (missing.files) return inputRef.current?.focus();

    setIsIngesting(true);
    setProgress(null);
    setError(null);
    continued.current = false;

    const marks = new Map<File, FileOutcome>();
    const mark = (file: File, outcome: FileOutcome) => {
      marks.set(file, outcome);
      setOutcomes(new Map(marks));
    };
    setOutcomes(new Map());

    const fail = (message: string) => {
      setError(message);
      setIsIngesting(false);
      setProgress(null);
    };

    const planned = await planSubmissions(files, MAX_SUBMISSION_BYTES);
    if (!planned.ok) {
      mark(planned.error.file, { ok: false, reason: planErrorReason(planned.error) });
      return fail(planErrorMessage(planned.error));
    }

    const { submissions, oversized } = planned.data;
    for (const file of oversized) mark(file, { ok: false, reason: t("outcome.tooLarge") });
    // One message per PDF or image that failed or was refused.
    const fileProblems = oversized.map(({ name }) => t("errors.fileOverLimit", { name }));
    // Set by the first file the server refuses: every file after it is skipped unsent.
    let filesDisabled: string | null = null;
    // Shown when no file went in. A lone failure keeps its own message; several are summed
    // up, since each row already carries its reason.
    const nothingIngested = () =>
      filesDisabled ??
      (fileProblems.length === 1
        ? fileProblems[0]
        : t("errors.noneIngested", { count: fileProblems.length }));
    if (submissions.length === 0 && fileProblems.length > 0) return fail(nothingIngested());

    const upserted = await attempt(upsertPatient(id));
    if (!upserted.ok) return fail(upserted.error);

    // A FHIR Bundle sent in slices is one file, however many slices went in.
    const acceptedFiles = new Set<File>();

    // A refused FHIR or CDA file stops the folder. What went in before it stays in, including
    // the earlier slices of a Bundle refused part way, which then counts as not ingested.
    const stop = (file: File, message: string) => {
      const partlySent = acceptedFiles.delete(file);
      mark(file, {
        ok: false,
        reason: t(partlySent ? "outcome.partlySent" : "outcome.rejected"),
        detail: message,
      });
      if (acceptedFiles.size === 0 && !partlySent) return fail(message);
      for (const { file: unsent } of submissions) {
        if (marks.has(unsent)) continue;
        mark(unsent, { ok: false, reason: t("outcome.notSent") });
      }
      setError(message);
      setIsIngesting(false);
      setProgress(null);
      setPartial({ patientId: id, accepted: acceptedFiles.size });
    };

    for (let index = 0; index < submissions.length; index++) {
      const submission = submissions[index];
      if (submission.kind === "file" && filesDisabled !== null) {
        mark(submission.file, { ok: false, reason: t("outcome.disabled"), detail: filesDisabled });
        continue;
      }
      setProgress({
        extracting: submission.kind === "file" ? submission.name : null,
        current: index + 1,
        total: submissions.length,
      });

      switch (submission.kind) {
        case "file": {
          const sent = await attempt(ingestFile(id, submission.file));
          const problem = !sent.ok
            ? { reason: t("outcome.notSent"), detail: sent.error }
            : sent.data.status === "failed"
              ? {
                  reason: t(sent.data.extraction ? "outcome.extractionFailed" : "outcome.rejected"),
                  detail: sent.data.message,
                }
              : null;
          if (problem !== null) {
            mark(submission.file, { ok: false, ...problem });
            fileProblems.push(
              t("errors.fileFailed", {
                name: submission.name,
                message: problem.detail ?? problem.reason,
              }),
            );
            continue;
          }
          if (sent.ok && sent.data.status === "disabled") {
            filesDisabled = sent.data.message;
            fileProblems.push(sent.data.message);
            mark(submission.file, {
              ok: false,
              reason: t("outcome.disabled"),
              detail: sent.data.message,
            });
            continue;
          }
          break;
        }
        case "fhir": {
          const sent = await attempt(ingestFhirR4(id, submission.resource));
          if (!sent.ok) return stop(submission.file, sent.error);
          break;
        }
        case "cda": {
          const sent = await attempt(ingestCdaR2(id, submission.document));
          if (!sent.ok) return stop(submission.file, sent.error);
          break;
        }
      }
      mark(submission.file, { ok: true });
      acceptedFiles.add(submission.file);
    }
    const accepted = acceptedFiles.size;

    if (accepted === 0 && fileProblems.length > 0) return fail(nothingIngested());
    if ([...marks.values()].some((outcome) => !outcome.ok)) {
      setIsIngesting(false);
      setProgress(null);
      setPartial({ patientId: id, accepted });
      return;
    }
    onSuccess(id, accepted);
  };

  return (
    <div className="space-y-6">
      <Field data-invalid={invalid.patientId || undefined}>
        <FieldLabel htmlFor="patient-id">{t("patientIdLabel")}</FieldLabel>
        <Input
          ref={idRef}
          id="patient-id"
          required
          value={patientId}
          aria-invalid={invalid.patientId || undefined}
          onChange={(event) => {
            setPatientId(event.target.value);
            // Once shown, the error clears as soon as the field is fixed.
            if (invalid.patientId)
              setInvalid((current) => ({ ...current, patientId: !event.target.value.trim() }));
          }}
          onBlur={() => setInvalid((current) => ({ ...current, patientId: !patientId.trim() }))}
          disabled={locked}
        />
        {invalid.patientId ? (
          <FieldError>{t("errors.patientIdRequired")}</FieldError>
        ) : (
          <FieldDescription>{t("patientIdPlaceholder")}</FieldDescription>
        )}
      </Field>

      {/* Clinia's File Upload look, with the studio's own drop handling: a dropped folder is read recursively and names the patient. */}
      <Field data-invalid={invalid.files || undefined}>
        <label
          data-slot="file-upload"
          data-dragging={isDragOver}
          aria-disabled={locked}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            if (!locked) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-background px-6 py-10 text-center text-sm transition-colors hover:bg-foreground/4 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30 has-[[aria-invalid=true]]:border-destructive aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-background data-[dragging=true]:border-solid data-[dragging=true]:border-accent data-[dragging=true]:bg-accent/15"
        >
          <CloudUploadIcon className="size-6 text-muted-foreground" />
          <span className="font-medium text-foreground">{t("dropzoneTitle")}</span>
          <span className="text-muted-foreground">{t("dropzoneHint")}</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            aria-invalid={invalid.files || undefined}
            disabled={locked}
            onChange={handlePick}
          />
        </label>
        {invalid.files && <FieldError>{t("errors.noFiles")}</FieldError>}
      </Field>

      {files.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <div className="text-muted-foreground flex items-center justify-between px-3 py-2 text-xs">
            <span>
              {t("filesDetected", { count: files.length })}
              {skipped > 0 && ` · ${t("filesSkipped", { count: skipped })}`}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setFiles([]);
                setOutcomes(new Map());
              }}
              disabled={locked}
            >
              <DeleteIcon />
              {t("clear")}
            </Button>
          </div>
          <ul className="max-h-48 divide-y overflow-y-auto">
            {files.map(({ file, kind }, index) => {
              const outcome = outcomes.get(file);
              const notIngested = kind === "unsupported" || outcome?.ok === false;
              const OutcomeIcon = !outcome ? DescriptionIcon : outcome.ok ? CheckIcon : CancelIcon;
              return (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <OutcomeIcon
                    aria-label={outcome && (outcome.ok ? t("outcome.sent") : outcome.reason)}
                    className={`size-4 shrink-0 ${outcome?.ok === false ? "text-destructive" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`min-w-0 flex-1 truncate ${notIngested ? "text-muted-foreground line-through" : ""}`}
                  >
                    {file.name}
                  </span>
                  {outcome?.ok === false ? (
                    <span
                      className="text-destructive max-w-[50%] shrink-0 truncate text-xs"
                      title={outcome.detail}
                    >
                      {outcome.reason}
                    </span>
                  ) : (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {KIND_LABEL[kind]}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <div className="text-destructive flex items-start gap-2 text-sm">
          <ErrorIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {partial ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {t("partialNotice", { accepted: partial.accepted })}
          </p>
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (continued.current) return;
              continued.current = true;
              onSuccess(partial.patientId, partial.accepted);
            }}
          >
            {t("continue")}
          </Button>
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={submit} disabled={isIngesting}>
          {isIngesting && <Spinner aria-hidden="true" />}
          {!isIngesting
            ? t("submit")
            : progress?.extracting
              ? t("extractingProgress", {
                  name: progress.extracting,
                  current: progress.current,
                  total: progress.total,
                })
              : progress && progress.total > 1
                ? t("submittingProgress", { current: progress.current, total: progress.total })
                : t("submitting")}
        </Button>
      )}
    </div>
  );
}
