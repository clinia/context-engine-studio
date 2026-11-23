"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Markdown } from "@/components/markdown";
import { FactDetailPanel } from "@/components/resolution/fact-detail-panel";
import { ResizableAside } from "@/components/resolution/resizable-aside";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { DescriptionIcon } from "@/components/ui/icons/description";
import { ErrorIcon } from "@/components/ui/icons/error";
import { StacksIcon } from "@/components/ui/icons/stacks";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { usePatient } from "@/contexts/patient-provider";
import { useVfsListing, type VfsLocation } from "@/contexts/vfs-listing-provider";
import { type ActionState, useActionResult } from "@/hooks/use-action-result";
import { useVfsLinkResolver, useVfsRoute } from "@/hooks/use-vfs-route";
import { readVfs, type ResolvedFact, type VfsFormat } from "@/lib/context-engine-client/actions";
import { resolveVfsFact, vfsFactEntryPath } from "@/lib/vfs-fact";
import { vfsName, vfsParent, type VfsPath } from "@/lib/vfs-path";

const FORMATS: { value: VfsFormat; labelKey: "tabNarrative" | "tabCompact" | "tabStructured" }[] = [
  { value: "narrative", labelKey: "tabNarrative" },
  { value: "compact", labelKey: "tabCompact" },
  { value: "structured", labelKey: "tabStructured" },
];

/**
 * The open file's heading: the readable name of the file, or of the fact it belongs to, read
 * from its parent's listing. A condition's files take the condition's name. The file name when
 * the listing names neither, and null while it loads.
 */
function useVfsHeading(location: VfsLocation | null): string | null {
  const entryPath = location && (vfsFactEntryPath(location.path) ?? location.path);
  const listing = useVfsListing(
    location && entryPath ? { patientId: location.patientId, path: vfsParent(entryPath) } : null,
  );
  if (!location || !entryPath || listing.status === "idle" || listing.status === "loading") {
    return null;
  }
  const children = listing.status === "loaded" ? listing.data.children : undefined;
  const entry = children?.find((child) => child.name === vfsName(entryPath));
  return entry?.display ?? vfsName(location.path) ?? location.path;
}

/** The resolved fact behind the open file, with a null fact when the file is not one. */
function useVfsFact(
  patientId: string | null,
  path: VfsPath | null,
): ActionState<ResolvedFact | null> {
  const load = React.useMemo(
    () => (patientId && path ? () => resolveVfsFact(patientId, path) : null),
    [patientId, path],
  );
  return useActionResult(load);
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
  const factState = useVfsFact(patientId, selectedPath);
  const fact = factState.status === "loaded" ? factState.data : null;
  const heading = useVfsHeading(
    patientId && selectedPath ? { patientId, path: selectedPath } : null,
  );
  const [panelOpen, setPanelOpen] = React.useState(false);
  const resolveLink = useVfsLinkResolver(selectedPath);

  React.useEffect(() => setPanelOpen(false), [selectedPath]);

  if (!selectedPath) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DescriptionIcon />
          </EmptyMedia>
          <EmptyDescription>{t("selectPrompt")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-auto px-4 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="text-body-m font-medium">{heading ?? "\u00a0"}</h1>
              <p className="text-xs break-all text-muted-foreground">{selectedPath}</p>
              {factState.status === "error" && (
                <p className="text-xs text-destructive">{t("factLoadError")}</p>
              )}
            </div>
            {fact && (
              <Toggle
                variant="outline"
                size="sm"
                // Holds its width when the fact panel narrows the column.
                className="shrink-0"
                pressed={panelOpen}
                onPressedChange={setPanelOpen}
              >
                <StacksIcon />
                {t("openResolution")}
              </Toggle>
            )}
          </div>
          <Tabs value={format} onValueChange={(value) => setFormat(value as VfsFormat)}>
            <TabsList>
              {FORMATS.map(({ value, labelKey }) => (
                <TabsTrigger key={value} value={value}>
                  {t(labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          {(state.status === "loading" || state.status === "idle") && (
            // Shaped like a document: a heading, then lines of text.
            <div className="flex flex-col gap-3" aria-busy="true">
              <span className="sr-only">{t("loading")}</span>
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
          {state.status === "error" && (
            <Alert variant="destructive" role="note">
              <ErrorIcon />
              <AlertDescription>{t("loadError")}</AlertDescription>
            </Alert>
          )}
          {state.status === "loaded" &&
            (format === "structured" ? (
              <pre className="overflow-x-auto rounded-lg border bg-card p-4 font-mono text-xs whitespace-pre-wrap">
                {state.data.content}
              </pre>
            ) : (
              <Markdown resolveLink={resolveLink}>{state.data.content}</Markdown>
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
