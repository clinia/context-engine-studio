"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Markdown } from "@/components/markdown";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { usePatient } from "@/contexts/patient-provider";
import { useVfsRoute } from "@/hooks/use-vfs-route";
import { readVfs, type VfsFormat } from "@/lib/context-engine-client/actions";

/** Load state for the currently selected file's content. */
type ContentState =
  | { status: "loading" }
  | { status: "loaded"; content: string }
  | { status: "error"; error: string };

const FORMATS: { value: VfsFormat; labelKey: "tabNarrative" | "tabCompact" | "tabStructured" }[] = [
  { value: "narrative", labelKey: "tabNarrative" },
  { value: "compact", labelKey: "tabCompact" },
  { value: "structured", labelKey: "tabStructured" },
];

function fileName(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments.at(-1) ?? path;
}

/**
 * Renders the VFS file selected via the URL (`?path=…&format=…`) in the main
 * content area. Content is fetched from the read endpoint and re-fetched
 * whenever the patient, path, or format changes. Narrative/compact render as
 * Markdown; structured renders as a raw JSON block.
 */
export function VfsFileViewer() {
  const { activePatient } = usePatient();
  const { selectedPath, format, setFormat } = useVfsRoute();
  const t = useTranslations("vfsViewer");
  const registryKey = activePatient?.registryKey ?? null;

  const [state, setState] = React.useState<ContentState>({ status: "loading" });

  React.useEffect(() => {
    if (!registryKey || !selectedPath) return;
    let cancelled = false;
    setState({ status: "loading" });

    void (async () => {
      const res = await readVfs(registryKey, selectedPath, format);
      if (cancelled) return;
      if (res.ok) setState({ status: "loaded", content: res.data.content });
      else setState({ status: "error", error: res.error });
    })();

    return () => {
      cancelled = true;
    };
  }, [registryKey, selectedPath, format]);

  if (!selectedPath) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">{t("selectPrompt")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold">{fileName(selectedPath)}</h1>
          <p className="text-xs break-all text-muted-foreground">{selectedPath}</p>
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
        {state.status === "loading" && (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        )}
        {state.status === "error" && <p className="text-sm text-destructive">{t("loadError")}</p>}
        {state.status === "loaded" &&
          (format === "structured" ? (
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre-wrap">
              {state.content}
            </pre>
          ) : (
            <Markdown>{state.content}</Markdown>
          ))}
      </div>
    </div>
  );
}
