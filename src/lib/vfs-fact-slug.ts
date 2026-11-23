/**
 * Finds the fact behind a path in a tree that names facts by slug, where no segment carries
 * the fact's id.
 */

import {
  listFactSlugs,
  readResolvedFact,
  type FactNodeType,
  type ResolvedFact,
} from "@/lib/context-engine-client/actions";
import { attempt, ok, type Result } from "@/lib/result";
import { NARRATIVES_SEGMENT, vfsPathOf, vfsSegments, type VfsPath } from "@/lib/vfs-path";

/** VFS sections whose entries are facts, with the depth of the fact's own segment. */
const FACT_SECTIONS: Record<string, { type: FactNodeType; depth: number }> = {
  conditions: { type: "condition", depth: 2 },
  medications: { type: "medication", depth: 2 },
  allergies: { type: "allergy", depth: 1 },
  family_history: { type: "family_history", depth: 1 },
  social_history: { type: "social_history", depth: 1 },
};

type SlugFactRef = { type: FactNodeType; slug: string; entryPath: VfsPath };

/**
 * The fact a VFS path names, read from the section's layout. Null for paths outside a fact
 * section, and for a condition's narratives at any depth, which are not the fact.
 */
function slugFactRef(path: VfsPath): SlugFactRef | null {
  const [section, ...rest] = vfsSegments(path);
  const entry = section ? FACT_SECTIONS[section] : undefined;
  if (!entry) return null;
  if (rest.slice(entry.depth).includes(NARRATIVES_SEGMENT)) return null;

  const slug = rest[entry.depth - 1]?.replace(/\.md$/, "");
  if (!slug) return null;
  return {
    type: entry.type,
    slug,
    entryPath: vfsPathOf([section, ...rest.slice(0, entry.depth)]),
  };
}

/** The path of the entry of the fact `path` belongs to. Null when it belongs to none. */
export function slugFactEntryPath(path: VfsPath): VfsPath | null {
  return slugFactRef(path)?.entryPath ?? null;
}

/** Slug → fact id per patient and fact type, kept for the session. */
const slugIndex = new Map<string, Promise<Result<Record<string, string>>>>();

function readSlugIndex(patientId: string, type: FactNodeType, refresh: boolean) {
  const key = `${patientId}:${type}`;
  let index = slugIndex.get(key);
  if (!index || refresh) {
    index = attempt(listFactSlugs(patientId, type));
    slugIndex.set(key, index);
    void index.then((result) => {
      if (!result.ok && slugIndex.get(key) === index) slugIndex.delete(key);
    });
  }
  return index;
}

/** The fact id behind a slug, re-reading the index once when the slug is missing. */
async function findFactIdBySlug(
  patientId: string,
  type: FactNodeType,
  slug: string,
): Promise<Result<string | null>> {
  for (const refresh of [false, true]) {
    const index = await readSlugIndex(patientId, type, refresh);
    if (!index.ok) return index;
    const id = index.data[slug];
    if (id) return ok(id);
  }
  return ok(null);
}

/** The resolved fact `path` names by slug. Null when it names none. */
export async function resolveVfsFactBySlug(
  patientId: string,
  path: VfsPath,
): Promise<Result<ResolvedFact | null>> {
  const ref = slugFactRef(path);
  if (!ref) return ok(null);
  const id = await findFactIdBySlug(patientId, ref.type, ref.slug);
  if (!id.ok) return id;
  return id.data ? readResolvedFact(patientId, id.data) : ok(null);
}
