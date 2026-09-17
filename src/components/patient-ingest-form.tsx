"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  detectFiles,
  planSubmissions,
  type DetectedFile,
  type PlanSubmissionsError,
} from "@/lib/ingest/plan-submissions";
import type { FileKind } from "@/lib/ingest/classify";
import { droppedDirectoryName, readDroppedItems } from "@/lib/ingest/collect";
import { ingestCdaR2, ingestFhirR4, upsertPatient } from "@/lib/context-engine-client/actions";
import { attempt } from "@/lib/result";
import {
  AlertCircleIcon,
  CloudUploadIcon,
  Delete02Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const KIND_LABEL: Record<FileKind, string> = {
  fhir: "FHIR",
  cda: "CDA",
  unsupported: "Skipped",
};

// One call carries one file, so this bounds a file rather than a batch. Kept under the
// Server Action body-size limit configured in next.config.ts
// (`serverActions.bodySizeLimit`), leaving margin for encoding.
const MAX_SUBMISSION_BYTES = 20 * 1024 * 1024;

/** Derives a patient id from the common top-level folder of a directory selection. */
function folderNameFromInput(files: File[]): string | null {
  const relativePath = (files[0] as File & { webkitRelativePath?: string })?.webkitRelativePath;
  return relativePath ? (relativePath.split("/")[0] ?? null) : null;
}

/**
 * Patient creation + file ingest form. Self-contained (id input, dropzone, file
 * list, submit); the caller decides what happens once every file is accepted
 * via {@link onSuccess}, which receives the created patient's id and how many
 * submissions it took.
 *
 * Acceptance is where the form's job ends. What each submission then goes on to
 * do is the ingestions view's subject, and waiting for it here would hold the
 * form open for as long as the record takes to process.
 */
export function PatientIngestForm({
  onSuccess,
}: {
  onSuccess: (patientId: string, accepted: number) => void;
}) {
  const t = useTranslations("patientIngest");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [patientId, setPatientId] = React.useState("");
  const [files, setFiles] = React.useState<DetectedFile[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isIngesting, setIsIngesting] = React.useState(false);
  const [progress, setProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // `webkitdirectory` is not a React prop, so it must be set on the DOM node.
  React.useEffect(() => {
    inputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  // Neither ingest endpoint takes an arbitrary file, so a dropped PDF has nowhere to
  // go. It is skipped rather than refused — a folder of clinical data routinely carries
  // a few — and the list marks it, so the skip is visible rather than silent.
  const skipped = files.filter(({ kind }) => kind === "unsupported").length;
  const submittable = files.length - skipped;

  const adoptFiles = React.useCallback((collected: File[], derivedId: string | null) => {
    if (collected.length === 0) return;
    setError(null);
    setFiles(detectFiles(collected));
    if (derivedId) setPatientId((current) => current || derivedId);
  }, []);

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const derivedId = droppedDirectoryName(event.dataTransfer.items);
    const collected = await readDroppedItems(event.dataTransfer.items);
    adoptFiles(collected, derivedId);
  };

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const collected = event.target.files ? Array.from(event.target.files) : [];
    adoptFiles(collected, folderNameFromInput(collected));
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
    if (!id || submittable === 0) return;

    setIsIngesting(true);
    setProgress(null);
    setError(null);

    const fail = (message: string) => {
      setError(message);
      setIsIngesting(false);
      setProgress(null);
    };

    const planned = await planSubmissions(files, MAX_SUBMISSION_BYTES);
    if (!planned.ok) return fail(planErrorMessage(planned.error));

    const upserted = await attempt(upsertPatient(id));
    if (!upserted.ok) return fail(upserted.error);

    const submissions = planned.data;
    for (let index = 0; index < submissions.length; index++) {
      setProgress({ current: index + 1, total: submissions.length });

      const submission = submissions[index];
      const accepted = await attempt(
        submission.kind === "fhir"
          ? ingestFhirR4(id, submission.resource)
          : ingestCdaR2(id, submission.document),
      );
      if (!accepted.ok) return fail(accepted.error);
    }

    onSuccess(id, submissions.length);
  };

  const canSubmit = patientId.trim().length > 0 && submittable > 0 && !isIngesting;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="patient-id" className="text-sm font-medium">
          {t("patientIdLabel")}
        </label>
        <Input
          id="patient-id"
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
          placeholder={t("patientIdPlaceholder")}
          disabled={isIngesting}
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
          isDragOver
            ? "border-ring bg-muted/50 text-foreground"
            : "border-input text-muted-foreground hover:border-ring/60 hover:bg-muted/30"
        }`}
      >
        <HugeiconsIcon icon={CloudUploadIcon} strokeWidth={2} className="size-6" />
        <div className="text-sm font-medium text-foreground">{t("dropzoneTitle")}</div>
        <div className="text-xs">{t("dropzoneHint")}</div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handlePick} />
      </div>

      {files.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          <div className="text-muted-foreground flex items-center justify-between px-3 py-2 text-xs">
            <span>
              {t("filesDetected", { count: files.length })}
              {skipped > 0 && ` · ${t("filesSkipped", { count: skipped })}`}
            </span>
            <Button variant="ghost" size="xs" onClick={() => setFiles([])} disabled={isIngesting}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              {t("clear")}
            </Button>
          </div>
          <ul className="max-h-48 divide-y overflow-y-auto">
            {files.map(({ file, kind }, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <HugeiconsIcon
                  icon={File01Icon}
                  strokeWidth={2}
                  className="text-muted-foreground size-4 shrink-0"
                />
                <span
                  className={`min-w-0 flex-1 truncate ${kind === "unsupported" ? "text-muted-foreground line-through" : ""}`}
                >
                  {file.name}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">{KIND_LABEL[kind]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="text-destructive flex items-start gap-2 text-sm">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            strokeWidth={2}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>{error}</span>
        </div>
      )}

      <Button className="w-full" size="lg" onClick={submit} disabled={!canSubmit}>
        {!isIngesting
          ? t("submit")
          : progress && progress.total > 1
            ? t("submittingProgress", progress)
            : t("submitting")}
      </Button>
    </div>
  );
}
