/**
 * Flattens files out of a drag-and-drop `DataTransferItemList`, descending into
 * dropped directories via the (non-standard but widely supported) entries API.
 *
 * The browser's `FileSystemDirectoryReader`/`FileSystemFileEntry` APIs are
 * callback-based; this module wraps them in promises so callers can `await`.
 * Dotfiles and zero-byte entries are skipped.
 */

function isMeaningfulFile(file: File): boolean {
  return !file.name.startsWith(".") && file.size > 0;
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

/** Reads a directory's immediate children. The API returns them in batches, so we drain it fully. */
function readDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];
    const readBatch = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    readBatch();
  });
}

async function collectEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntry);
    return isMeaningfulFile(file) ? [file] : [];
  }
  if (entry.isDirectory) {
    const children = await readDirectoryEntries((entry as FileSystemDirectoryEntry).createReader());
    const nested = await Promise.all(children.map(collectEntry));
    return nested.flat();
  }
  return [];
}

/**
 * The folder name of a dropped directory, if a single directory was dropped.
 * Useful for auto-deriving a patient id.
 */
export function droppedDirectoryName(items: DataTransferItemList): string | null {
  const entry = items[0]?.webkitGetAsEntry?.();
  return entry?.isDirectory ? entry.name : null;
}

/** Collects all meaningful files from a drop, recursing into directories. */
export async function readDroppedItems(items: DataTransferItemList): Promise<File[]> {
  const entries = Array.from(items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => entry != null);

  if (entries.length === 0) return [];

  const collected = await Promise.all(entries.map(collectEntry));
  return collected.flat();
}
