"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { detectFiles, planIngestBatches, type DetectedFile } from "@/lib/ingest/build-batch";
import type { FileKind } from "@/lib/ingest/classify";
import { droppedDirectoryName, readDroppedItems } from "@/lib/ingest/collect";
import { getExecution, ingestBatch, upsertPatient } from "@/lib/context-engine-client/actions";
import { attempt, err, ok, type Result } from "@/lib/result";
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
  document: "Document",
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

// Keep each batch comfortably under the Server Action body-size limit configured
// in next.config.ts (`serverActions.bodySizeLimit`), leaving margin for encoding.
const MAX_BATCH_BYTES = 20 * 1024 * 1024;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Derives a patient id from the common top-level folder of a directory selection. */
function folderNameFromInput(files: File[]): string | null {
  const relativePath = (files[0] as File & { webkitRelativePath?: string })?.webkitRelativePath;
  return relativePath ? (relativePath.split("/")[0] ?? null) : null;
}

/**
 * Patient creation + file ingest form. Self-contained (id input, dropzone, file
 * list, submit + polling); the caller decides what happens after a successful
 * ingest via {@link onSuccess}, which receives the created patient's id.
 */
export function PatientIngestForm({ onSuccess }: { onSuccess: (patientId: string) => void }) {
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

  const waitForTerminal = async (id: string, executionId: string): Promise<Result<void>> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const result = await attempt(getExecution(id, executionId));
      if (!result.ok) return result;
      const { execution } = result.data;
      if (execution.status === "succeeded" || execution.status === "skipped") return ok(undefined);
      if (execution.status === "failed")
        return err(execution.errorCode ?? t("errors.ingestionFailed"));
    }
    return err(t("errors.timedOut"));
  };

  const submit = async () => {
    const id = patientId.trim();
    if (!id || files.length === 0) return;

    setIsIngesting(true);
    setProgress(null);
    setError(null);

    const fail = (message: string) => {
      setError(message);
      setIsIngesting(false);
      setProgress(null);
    };

    const planned = await planIngestBatches(files, MAX_BATCH_BYTES);
    if (!planned.ok) return fail(t("errors.invalidJson", { name: planned.error.invalidFile }));

    const upserted = await attempt(upsertPatient(id));
    if (!upserted.ok) return fail(upserted.error);

    const batches = planned.data;
    for (let index = 0; index < batches.length; index++) {
      setProgress({ current: index + 1, total: batches.length });

      const ingested = await attempt(ingestBatch(id, batches[index]));
      if (!ingested.ok) return fail(ingested.error);

      const envelope = ingested.data;
      if (envelope.status === "failed") {
        return fail(envelope.error?.message ?? t("errors.ingestionFailed"));
      }
      if (envelope.status !== "succeeded" && envelope.status !== "skipped") {
        const terminal = await waitForTerminal(id, envelope.executionId);
        if (!terminal.ok) return fail(terminal.error);
      }
    }

    onSuccess(id);
  };

  const canSubmit = patientId.trim().length > 0 && files.length > 0 && !isIngesting;

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
            <span>{t("filesDetected", { count: files.length })}</span>
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
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
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
