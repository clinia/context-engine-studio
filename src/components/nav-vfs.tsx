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
import { useVfsListingReader } from "@/contexts/vfs-listing-provider";
import { orderByCountHint } from "@/lib/vfs-order";
import { VFS_ROOT, vfsAncestors, vfsChild, vfsPath, type VfsPath } from "@/lib/vfs-path";
import type { BrowseResult } from "@clinia/context-engine-js";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { DescriptionIcon } from "@/components/ui/icons/description";
import { FolderIcon } from "@/components/ui/icons/folder";

type VfsChild = NonNullable<BrowseResult["children"]>[number];

/** Load state for the children of a single directory path. */
type DirState =
  | { status: "loading" }
  | { status: "loaded"; children: VfsChild[] }
  | { status: "error"; error: string };

type VfsTreeContextValue = {
  /** Children + load state for a directory path, or `undefined` if never requested. */
  getDir: (path: VfsPath) => DirState | undefined;
  /** Fetches a directory's children once; repeat calls for the same path are ignored. */
  expandDir: (path: VfsPath) => void;
  /** Whether a directory node is currently expanded. */
  isOpen: (path: VfsPath) => boolean;
  /** Toggles a directory node's expanded state. */
  setOpen: (path: VfsPath, open: boolean) => void;
  /** Path of the file currently open in the main content, for active-state highlighting. */
  selectedPath: VfsPath | null;
  /** Called when a file leaf is clicked. */
  onSelectFile?: (path: VfsPath) => void;
};

const VfsTreeContext = React.createContext<VfsTreeContextValue | null>(null);

function useVfsTree(): VfsTreeContextValue {
  const ctx = React.useContext(VfsTreeContext);
  if (!ctx) throw new Error("useVfsTree must be used within NavVfs.");
  return ctx;
}

function TreeMessage({ children }: { children: React.ReactNode }) {
  // A list item: it sits in the menu list among the entries it stands in for.
  return <li className="px-3 py-1 text-xs text-sidebar-foreground/60">{children}</li>;
}

/**
 * A single VFS node. Directories are collapsible and lazily fetch their children
 * on first expand; files are display-only for now (opening file content is a
 * follow-up PR).
 */
function TreeNode({ node, path }: { node: VfsChild; path: VfsPath }) {
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
          <DescriptionIcon />
          <span>{node.display ?? node.name}</span>
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
          isMuted={node.countHint === 0}
          className="[&>svg:first-child]:transition-transform [&[data-panel-open]>svg:first-child]:rotate-90"
        >
          <ChevronRightIcon />
          <FolderIcon />
          <span>{node.display ?? node.name}</span>
          {node.countHint !== undefined && (
            <span className="text-sidebar-foreground/60 tabular-nums">({node.countHint})</span>
          )}
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
                <TreeNode key={child.name} node={child} path={vfsChild(path, child.name)} />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

type RootState =
  | { status: "loading" }
  | { status: "loaded"; path: VfsPath; children: VfsChild[] }
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
  selectedPath?: VfsPath | null;
  onSelectFile?: (path: VfsPath) => void;
}) {
  const { activePatient } = usePatient();
  const t = useTranslations("navVfs");
  const patientId = activePatient?.registryKey ?? null;

  const [root, setRoot] = React.useState<RootState>({ status: "loading" });
  const [dirs, setDirs] = React.useState<Map<VfsPath, DirState>>(new Map());
  const [openDirs, setOpenDirs] = React.useState<Set<VfsPath>>(new Set());
  const requested = React.useRef<Set<VfsPath>>(new Set());
  const readListing = useVfsListingReader();

  const setOpen = React.useCallback((path: VfsPath, open: boolean) => {
    setOpenDirs((prev) => {
      const next = new Set(prev);
      if (open) next.add(path);
      else next.delete(path);
      return next;
    });
  }, []);

  const expandDir = React.useCallback(
    async (path: VfsPath) => {
      if (!patientId || requested.current.has(path)) return;
      requested.current.add(path);
      setDirs((prev) => new Map(prev).set(path, { status: "loading" }));

      const res = await readListing({ patientId, path });
      setDirs((prev) => {
        const next = new Map(prev);
        if (res.ok && res.data.type === "directory") {
          next.set(path, { status: "loaded", children: orderByCountHint(res.data.children ?? []) });
        } else {
          next.set(path, { status: "error", error: res.ok ? "Not a directory" : res.error });
          requested.current.delete(path); // allow a retry on the next expand
        }
        return next;
      });
    },
    [patientId, readListing],
  );

  // Load the root on mount. NavVfs is keyed by patient in the sidebar, so
  // switching patients remounts this component with fresh state.
  React.useEffect(() => {
    if (!patientId) return;
    let cancelled = false;

    void (async () => {
      const res = await readListing({ patientId, path: VFS_ROOT });
      if (cancelled) return;
      if (res.ok && res.data.type === "directory") {
        setRoot({
          status: "loaded",
          path: vfsPath(res.data.path),
          children: orderByCountHint(res.data.children ?? []),
        });
      } else {
        setRoot({ status: "error", error: res.ok ? "Unexpected response" : res.error });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId, readListing]);

  // Reveal the selected file on load / when it changes: open each ancestor
  // directory and fetch its children so the lazy tree expands down to the leaf
  // (e.g. after a reload or navigating in from another route).
  React.useEffect(() => {
    if (root.status !== "loaded" || !selectedPath) return;
    const ancestors = vfsAncestors(selectedPath);
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

  if (!patientId) return null;

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
                <TreeNode key={child.name} node={child} path={vfsChild(root.path, child.name)} />
              ))}
          </SidebarMenu>
        </VfsTreeContext.Provider>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
