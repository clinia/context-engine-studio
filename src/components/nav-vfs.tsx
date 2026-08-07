"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { usePatient } from "@/contexts/patient-provider";
import { browseVfs } from "@/lib/context-engine-client/actions";
import type { BrowseResult } from "@clinia/context-engine-js";
import { ArrowRight01Icon, File01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type VfsChild = NonNullable<BrowseResult["children"]>[number];

/** Load state for the children of a single directory path. */
type DirState =
  | { status: "loading" }
  | { status: "loaded"; children: VfsChild[] }
  | { status: "error"; error: string };

type VfsTreeContextValue = {
  /** Children + load state for a directory path, or `undefined` if never requested. */
  getDir: (path: string) => DirState | undefined;
  /** Fetches a directory's children once; repeat calls for the same path are ignored. */
  expandDir: (path: string) => void;
  /** Whether a directory node is currently expanded. */
  isOpen: (path: string) => boolean;
  /** Toggles a directory node's expanded state. */
  setOpen: (path: string, open: boolean) => void;
  /** Path of the file currently open in the main content, for active-state highlighting. */
  selectedPath: string | null;
  /** Called when a file leaf is clicked. */
  onSelectFile?: (path: string) => void;
};

const VfsTreeContext = React.createContext<VfsTreeContextValue | null>(null);

function useVfsTree(): VfsTreeContextValue {
  const ctx = React.useContext(VfsTreeContext);
  if (!ctx) throw new Error("useVfsTree must be used within NavVfs.");
  return ctx;
}

function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, "");
}

/**
 * The directory paths that must be open to reveal `selected`, given the tree's
 * `rootPath`. Returns the chain of ancestor directories (excluding the leaf
 * itself), each in the same `${rootPath}/seg/…` form as the tree's node paths.
 */
function ancestorDirs(selected: string, rootPath: string): string[] {
  const prefix = `${rootPath}/`;
  if (!selected.startsWith(prefix)) return [];
  const segments = selected.slice(prefix.length).split("/").filter(Boolean);
  const dirs: string[] = [];
  let current = rootPath;
  for (let i = 0; i < segments.length - 1; i++) {
    current = `${current}/${segments[i]}`;
    dirs.push(current);
  }
  return dirs;
}

function TreeMessage({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-1 text-xs text-sidebar-foreground/60">{children}</div>;
}

/**
 * A single VFS node. Directories are collapsible and lazily fetch their children
 * on first expand; files are display-only for now (opening file content is a
 * follow-up PR).
 */
function TreeNode({ node, path }: { node: VfsChild; path: string }) {
  const { getDir, expandDir, isOpen, setOpen, selectedPath, onSelectFile } = useVfsTree();
  const t = useTranslations("navVfs");

  if (node.type === "file") {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          title={node.preview}
          isActive={selectedPath === path}
          onClick={() => onSelectFile?.(path)}
        >
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          <span>{node.name}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const dir = getDir(path);

  return (
    <SidebarMenuItem>
      <Collapsible
        open={isOpen(path)}
        onOpenChange={(open) => {
          setOpen(path, open);
          if (open) void expandDir(path);
        }}
      >
        <SidebarMenuButton
          render={<CollapsibleTrigger />}
          className="[&>svg:first-child]:transition-transform [&[data-panel-open]>svg:first-child]:rotate-90"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
          <span>{node.name}</span>
        </SidebarMenuButton>
        <CollapsibleContent>
          <SidebarMenuSub>
            {(dir === undefined || dir.status === "loading") && <SidebarMenuSkeleton showIcon />}
            {dir?.status === "error" && <TreeMessage>{t("dirLoadError")}</TreeMessage>}
            {dir?.status === "loaded" && dir.children.length === 0 && (
              <TreeMessage>{t("dirEmpty")}</TreeMessage>
            )}
            {dir?.status === "loaded" &&
              dir.children.map((child) => (
                <TreeNode key={child.name} node={child} path={`${path}/${child.name}`} />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

type RootState =
  | { status: "loading" }
  | { status: "loaded"; path: string; children: VfsChild[] }
  | { status: "error"; error: string };

/**
 * "Virtual file system" sidebar group: a lazy, collapsible tree of the active patient's
 * virtual file system. The root is fetched on mount; each folder fetches its
 * children the first time it is expanded and the result is cached so
 * re-expanding never refetches.
 */
export function NavVfs({
  selectedPath = null,
  onSelectFile,
}: {
  selectedPath?: string | null;
  onSelectFile?: (path: string) => void;
}) {
  const { activePatient } = usePatient();
  const t = useTranslations("navVfs");
  const registryKey = activePatient?.registryKey ?? null;

  const [root, setRoot] = React.useState<RootState>({ status: "loading" });
  const [dirs, setDirs] = React.useState<Map<string, DirState>>(new Map());
  const [openDirs, setOpenDirs] = React.useState<Set<string>>(new Set());
  const requested = React.useRef<Set<string>>(new Set());

  const setOpen = React.useCallback((path: string, open: boolean) => {
    setOpenDirs((prev) => {
      const next = new Set(prev);
      if (open) next.add(path);
      else next.delete(path);
      return next;
    });
  }, []);

  const expandDir = React.useCallback(
    async (path: string) => {
      if (!registryKey || requested.current.has(path)) return;
      requested.current.add(path);
      setDirs((prev) => new Map(prev).set(path, { status: "loading" }));

      const res = await browseVfs(registryKey, path);
      setDirs((prev) => {
        const next = new Map(prev);
        if (res.ok && res.data.type === "directory") {
          next.set(path, { status: "loaded", children: res.data.children ?? [] });
        } else {
          next.set(path, { status: "error", error: res.ok ? "Not a directory" : res.error });
          requested.current.delete(path); // allow a retry on the next expand
        }
        return next;
      });
    },
    [registryKey],
  );

  // Load the root on mount. NavVfs is keyed by patient in the sidebar, so
  // switching patients remounts this component with fresh state.
  React.useEffect(() => {
    if (!registryKey) return;
    let cancelled = false;

    void (async () => {
      const res = await browseVfs(registryKey);
      if (cancelled) return;
      if (res.ok && res.data.type === "directory") {
        setRoot({
          status: "loaded",
          path: stripTrailingSlash(res.data.path),
          children: res.data.children ?? [],
        });
      } else {
        setRoot({ status: "error", error: res.ok ? "Unexpected response" : res.error });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [registryKey]);

  // Reveal the selected file on load / when it changes: open each ancestor
  // directory and fetch its children so the lazy tree expands down to the leaf
  // (e.g. after a reload or navigating in from another route).
  React.useEffect(() => {
    if (root.status !== "loaded" || !selectedPath) return;
    const ancestors = ancestorDirs(selectedPath, root.path);
    if (ancestors.length === 0) return;
    setOpenDirs((prev) => {
      const next = new Set(prev);
      ancestors.forEach((path) => next.add(path));
      return next;
    });
    ancestors.forEach((path) => void expandDir(path));
  }, [root, selectedPath, expandDir]);

  const ctx = React.useMemo<VfsTreeContextValue>(
    () => ({
      getDir: (path) => dirs.get(path),
      expandDir,
      isOpen: (path) => openDirs.has(path),
      setOpen,
      selectedPath,
      onSelectFile,
    }),
    [dirs, expandDir, openDirs, setOpen, selectedPath, onSelectFile],
  );

  if (!registryKey) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("label")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <VfsTreeContext.Provider value={ctx}>
          <SidebarMenu>
            {root.status === "loading" && (
              <>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </>
            )}
            {root.status === "error" && <TreeMessage>{t("loadError")}</TreeMessage>}
            {root.status === "loaded" && root.children.length === 0 && (
              <TreeMessage>{t("empty")}</TreeMessage>
            )}
            {root.status === "loaded" &&
              root.children.map((child) => (
                <TreeNode key={child.name} node={child} path={`${root.path}/${child.name}`} />
              ))}
          </SidebarMenu>
        </VfsTreeContext.Provider>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
