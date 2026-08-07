"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { VfsFormat } from "@/lib/context-engine-client/actions";

export const DEFAULT_VFS_FORMAT: VfsFormat = "narrative";

const VFS_FORMATS: readonly VfsFormat[] = ["narrative", "compact", "structured"];

function isVfsFormat(value: string | null): value is VfsFormat {
  return value !== null && (VFS_FORMATS as readonly string[]).includes(value);
}

export type VfsRoute = {
  /** Currently selected VFS file path, or `null` when no file is open. */
  selectedPath: string | null;
  /** Requested render format, defaulting to {@link DEFAULT_VFS_FORMAT}. */
  format: VfsFormat;
  /** Opens a file in the main content by setting `path`, preserving `format`. */
  selectFile: (path: string) => void;
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

  const selectedPath = searchParams.get("path");
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

  const push = React.useCallback(
    (key: "path" | "format", value: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(key, value);
      router.push(`${patientBase}?${next.toString()}`);
    },
    [patientBase, router, searchParams],
  );

  const selectFile = React.useCallback((path: string) => push("path", path), [push]);
  const setFormat = React.useCallback((value: VfsFormat) => push("format", value), [push]);
  const clearSelection = React.useCallback(() => router.push(patientBase), [patientBase, router]);

  return { selectedPath, format, selectFile, setFormat, clearSelection };
}
