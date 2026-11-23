/** The folder that holds a condition's narratives, which are not the condition itself. */
export const NARRATIVES_SEGMENT = "_narratives";

/**
 * An absolute path in a patient's file tree: `/` for the root, `/a/b` below it, with no
 * trailing slash. Build one with {@link vfsPath} or {@link vfsPathOf}.
 */
export type VfsPath = string & { readonly __brand: "VfsPath" };

export const VFS_ROOT = "/" as VfsPath;

/** The path with these segments, the root when there are none. */
export function vfsPathOf(segments: readonly string[]): VfsPath {
  return `/${segments.join("/")}` as VfsPath;
}

/** Reads a path in any spelling: a missing leading slash, a trailing or a doubled one. */
export function vfsPath(raw: string): VfsPath {
  return vfsPathOf(raw.split("/").filter(Boolean));
}

/** The path's segments, none for the root. */
export function vfsSegments(path: VfsPath): string[] {
  return path.split("/").filter(Boolean);
}

/** The path's last segment. Null for the root. */
export function vfsName(path: VfsPath): string | null {
  return vfsSegments(path).at(-1) ?? null;
}

/** The folder that holds the path. The root holds itself. */
export function vfsParent(path: VfsPath): VfsPath {
  return vfsPathOf(vfsSegments(path).slice(0, -1));
}

export function vfsChild(path: VfsPath, name: string): VfsPath {
  return vfsPathOf([...vfsSegments(path), name]);
}

/** The folders that hold the path, outermost first, without the root. */
export function vfsAncestors(path: VfsPath): VfsPath[] {
  const segments = vfsSegments(path);
  return segments.slice(0, -1).map((_, index) => vfsPathOf(segments.slice(0, index + 1)));
}

function safeDecodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * The path a link written in the file at `from` points to. A relative link starts from the
 * folder that holds the file, and one that climbs above the root stops there.
 *
 * Null for a link that leaves the file tree: one with a scheme or a host, or a bare fragment.
 * `from` is null for text that is not a file, such as a chat message; a relative link is then
 * null too.
 */
export function vfsResolve(from: VfsPath | null, href: string): VfsPath | null {
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return null;
  const [target = ""] = href.split(/[?#]/);
  if (!target) return null;
  const absolute = target.startsWith("/");
  if (!absolute && !from) return null;

  const segments = absolute || !from ? [] : vfsSegments(vfsParent(from));
  for (const segment of target.split("/")) {
    if (segment === "..") segments.pop();
    else if (segment && segment !== ".") segments.push(safeDecodeSegment(segment));
  }
  return vfsPathOf(segments);
}
