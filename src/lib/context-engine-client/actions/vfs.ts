"use server";

import { toResult } from "@/lib/context-engine-client/actions/to-result";
import { serverClient } from "@/lib/context-engine-client/server";
import type { Result } from "@/lib/result";
import type { BrowseResult, ReadResponse } from "@clinia/context-engine-js";

/** Output format for {@link readVfs}; mirrors the `format` query of the read endpoint. */
export type VfsFormat = "narrative" | "structured" | "compact";

/**
 * Lists the immediate children of a node in a patient's virtual file system.
 *
 * The VFS is lazy: a single call returns only the direct children of `path`
 * (the root when `path` is omitted), so callers fetch deeper levels on demand
 * as the user expands folders.
 */
export async function browseVfs(patientId: string, path?: string): Promise<Result<BrowseResult>> {
  const { data, error } = await serverClient.http.GET("/v1/patients/{patientId}/vfs", {
    params: { path: { patientId }, query: path ? { path } : undefined },
  });
  return toResult(data, error);
}

/**
 * Reads the rendered content of a VFS file at `path`.
 *
 * `format` controls how the file is rendered: `narrative` (full Markdown, the
 * default), `compact` (condensed Markdown), or `structured` (machine-readable
 * JSON string).
 */
export async function readVfs(
  patientId: string,
  path: string,
  format: VfsFormat = "narrative",
): Promise<Result<ReadResponse>> {
  const { data, error } = await serverClient.http.GET("/v1/patients/{patientId}/read", {
    params: { path: { patientId }, query: { path, format } },
  });
  return toResult(data, error);
}
