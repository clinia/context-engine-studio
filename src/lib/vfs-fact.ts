import { readResolvedFact, type ResolvedFact } from "@/lib/context-engine-client/actions";
import type { Result } from "@/lib/result";
import { resolveVfsFactBySlug, slugFactEntryPath } from "@/lib/vfs-fact-slug";
import { NARRATIVES_SEGMENT, vfsPathOf, vfsSegments, type VfsPath } from "@/lib/vfs-path";

const FACT_ID_PREFIX = "fct_";

type VfsFactRef = {
  /** The fact's id, read from its segment in the path. */
  id: string;
  /** The path of the fact's own entry, a folder for a condition and a file otherwise. */
  entryPath: VfsPath;
};

/**
 * The fact a VFS path names: its last segment that is a fact id. Null when no segment is one,
 * and for a condition's narratives, which are not the fact.
 */
function vfsFactRef(path: VfsPath): VfsFactRef | null {
  const segments = vfsSegments(path);
  const index = segments.findLastIndex((segment) => segment.startsWith(FACT_ID_PREFIX));
  const segment = segments[index];
  if (!segment || segments.slice(index + 1).includes(NARRATIVES_SEGMENT)) return null;
  return {
    id: segment.replace(/\.md$/, ""),
    entryPath: vfsPathOf(segments.slice(0, index + 1)),
  };
}

/** The path of the entry of the fact `path` belongs to. Null when it belongs to none. */
export function vfsFactEntryPath(path: VfsPath): VfsPath | null {
  return vfsFactRef(path)?.entryPath ?? slugFactEntryPath(path);
}

/** The resolved fact `path` belongs to. Null when it belongs to none. */
export async function resolveVfsFact(
  patientId: string,
  path: VfsPath,
): Promise<Result<ResolvedFact | null>> {
  const ref = vfsFactRef(path);
  if (ref) return readResolvedFact(patientId, ref.id);
  return resolveVfsFactBySlug(patientId, path);
}
