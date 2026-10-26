"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { GitMergeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Markdown } from "@/components/markdown";
import { FactDetailPanel } from "@/components/resolution/fact-detail-panel";
import { ResizableAside } from "@/components/resolution/resizable-aside";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { usePatient } from "@/contexts/patient-provider";
import { useActionResult } from "@/hooks/use-action-result";
import { useVfsRoute } from "@/hooks/use-vfs-route";
import {
  listFactSlugs,
  readResolvedFact,
  readVfs,
  type FactNodeType,
  type ResolvedFact,
  type VfsFormat,
} from "@/lib/context-engine-client/actions";
import { attempt, ok, type Result } from "@/lib/result";
import { vfsFactRef } from "@/lib/vfs-fact";

const FORMATS: { value: VfsFormat; labelKey: "tabNarrative" | "tabCompact" | "tabStructured" }[] = [
  { value: "narrative", labelKey: "tabNarrative" },
  { value: "compact", labelKey: "tabCompact" },
  { value: "structured", labelKey: "tabStructured" },
];

function fileName(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments.at(-1) ?? path;
}

/** File name → fact id per patient and fact type, kept for the session. */
const slugIndex = new Map<string, Promise<Result<Record<string, string>>>>();

function readSlugIndex(patientId: string, type: FactNodeType, refresh: boolean) {
  const key = `${patientId}:${type}`;
  let index = slugIndex.get(key);
  if (!index || refresh) {
    index = attempt(listFactSlugs(patientId, type));
    slugIndex.set(key, index);
  }
  return index;
}

/** The fact id behind a file name, re-reading the index once when the name is missing. */
async function findFactId(patientId: string, type: FactNodeType, slug: string) {
  for (const refresh of [false, true]) {
    const index = await readSlugIndex(patientId, type, refresh);
    if (!index.ok) return null;
    const id = index.data[slug];
    if (id) return id;
  }
  return null;
}

/** The resolved fact behind the open file, or null when the file is not a fact. */
function useVfsFact(patientId: string | null, path: string | null): ResolvedFact | null {
  const ref = path ? vfsFactRef(path) : null;
  const type = ref?.type;
  const slug = ref?.slug;

  const load = React.useMemo(
    () =>
      patientId && type && slug
        ? async () => {
            const id = await findFactId(patientId, type, slug);
            return id ? readResolvedFact(patientId, id) : ok(null);
          }
        : null,
    [patientId, type, slug],
  );
  const state = useActionResult(load);
  return state.status === "loaded" ? state.data : null;
}

/**
 * Renders the VFS file selected via the URL (`?path=…&format=…`) in the main
 * content area. Content is fetched from the read endpoint and re-fetched
 * whenever the patient, path, or format changes. Narrative/compact render as
 * Markdown; structured renders as a raw JSON block.
 *
 * A file that is a resolved fact offers its resolution panel beside the content.
 */
export function VfsFileViewer() {
  const { activePatient } = usePatient();
  const { selectedPath, format, setFormat } = useVfsRoute();
  const t = useTranslations("vfsViewer");
  const patientId = activePatient?.registryKey ?? null;

  const loadContent = React.useMemo(
    () => (patientId && selectedPath ? () => readVfs(patientId, selectedPath, format) : null),
    [patientId, selectedPath, format],
  );
  const state = useActionResult(loadContent);
  const fact = useVfsFact(patientId, selectedPath);
  const [panelOpen, setPanelOpen] = React.useState(false);

  React.useEffect(() => setPanelOpen(false), [selectedPath]);

  if (!selectedPath) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">{t("selectPrompt")}</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-auto px-4 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="text-lg font-semibold">{fileName(selectedPath)}</h1>
              <p className="text-xs break-all text-muted-foreground">{selectedPath}</p>
            </div>
            {fact && (
              <Button
                variant="outline"
                size="sm"
                aria-pressed={panelOpen}
                onClick={() => setPanelOpen((open) => !open)}
              >
                <HugeiconsIcon icon={GitMergeIcon} strokeWidth={2} />
                {t("openResolution")}
              </Button>
            )}
          </div>
          <Tabs value={format} onValueChange={(value) => setFormat(value as VfsFormat)}>
            <TabsList>
              {FORMATS.map(({ value, labelKey }) => (
                <TabsTab key={value} value={value}>
                  {t(labelKey)}
                </TabsTab>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          {(state.status === "loading" || state.status === "idle") && (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          )}
          {state.status === "error" && <p className="text-sm text-destructive">{t("loadError")}</p>}
          {state.status === "loaded" &&
            (format === "structured" ? (
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre-wrap">
                {state.data.content}
              </pre>
            ) : (
              <Markdown>{state.data.content}</Markdown>
            ))}
        </div>
      </div>

      {fact && panelOpen && (
        <ResizableAside>
          <FactDetailPanel
            fact={fact}
            registryKey={patientId}
            onClose={() => setPanelOpen(false)}
          />
        </ResizableAside>
      )}
    </div>
  );
}
