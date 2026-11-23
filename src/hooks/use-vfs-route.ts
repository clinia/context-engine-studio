"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { VfsFormat } from "@/lib/context-engine-client/actions";
import type { LinkResolver } from "@/lib/link-resolver";
import { vfsPath, vfsResolve, type VfsPath } from "@/lib/vfs-path";

export const DEFAULT_VFS_FORMAT: VfsFormat = "narrative";

const VFS_FORMATS: readonly VfsFormat[] = ["narrative", "compact", "structured"];

function isVfsFormat(value: string | null): value is VfsFormat {
  return value !== null && (VFS_FORMATS as readonly string[]).includes(value);
}

export type VfsRoute = {
  /** Currently selected VFS file path, or `null` when no file is open. */
  selectedPath: VfsPath | null;
  /** Requested render format, defaulting to {@link DEFAULT_VFS_FORMAT}. */
  format: VfsFormat;
  /** The URL that opens a file in the main content, preserving `format`. */
  fileHref: (path: VfsPath) => string;
  /** Opens a file in the main content by setting `path`, preserving `format`. */
  selectFile: (path: VfsPath) => void;
  /** Switches the render format, preserving the open `path`. */
  setFormat: (format: VfsFormat) => void;
  /** Closes the open file, returning to the bare patient view. */
  clearSelection: () => void;
};

/**
 * Single owner of the VFS view's URL contract:
 * `?path=<vfsPath>&format=narrative|compact|structured`.
 *
 * Reading and writing the selection goes exclusively through this hook so the
 * sidebar tree and the content viewer stay in sync without duplicated
 * `next/navigation` wiring. Both writers preserve the other param.
 */
export function useVfsRoute(): VfsRoute {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pathParam = searchParams.get("path");
  const selectedPath = pathParam ? vfsPath(pathParam) : null;
  const formatParam = searchParams.get("format");
  const format = isVfsFormat(formatParam) ? formatParam : DEFAULT_VFS_FORMAT;

  // The VFS viewer lives on the patient page (`/patients/{id}`), so writes
  // target that base rather than the current route — otherwise selecting a file
  // from a sub-route (e.g. the chat page) just appends `?path` to that route
  // instead of opening the file in the viewer.
  const patientBase = React.useMemo(() => {
    const [, patients, id] = pathname.split("/");
    return patients === "patients" && id ? `/${patients}/${id}` : pathname;
  }, [pathname]);

  const hrefWith = React.useCallback(
    (key: "path" | "format", value: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(key, value);
      return `${patientBase}?${next.toString()}`;
    },
    [patientBase, searchParams],
  );
  const push = React.useCallback(
    (key: "path" | "format", value: string) => router.push(hrefWith(key, value)),
    [hrefWith, router],
  );

  const fileHref = React.useCallback((path: VfsPath) => hrefWith("path", path), [hrefWith]);
  const selectFile = React.useCallback((path: VfsPath) => push("path", path), [push]);
  const setFormat = React.useCallback((value: VfsFormat) => push("format", value), [push]);
  const clearSelection = React.useCallback(() => router.push(patientBase), [patientBase, router]);

  return { selectedPath, format, fileHref, selectFile, setFormat, clearSelection };
}

/**
 * Maps a link in rendered Markdown to the URL that opens its file in the viewer. Relative
 * links start from the file at `from`. Leave `from` out for Markdown that is not a file, such
 * as a chat message, where only absolute links resolve.
 */
export function useVfsLinkResolver(from: VfsPath | null = null): LinkResolver {
  const { fileHref } = useVfsRoute();
  return React.useCallback(
    (href: string) => {
      const target = vfsResolve(from, href);
      return target ? fileHref(target) : null;
    },
    [from, fileHref],
  );
}
