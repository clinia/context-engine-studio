/**
 * Wall-clock time a submission spent being worked — `completedAt` minus `startedAt`, so the
 * queue wait in front of it is not counted. Null until both instants exist.
 */
export function formatDuration(fromIso: string | null, toIso: string | null): string | null {
  if (fromIso === null || toIso === null) return null;
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms < 1000) return `${Math.max(0, ms)}ms`;

  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const DECIMAL_UNITS = [
  ["TB", 1e12],
  ["GB", 1e9],
  ["MB", 1e6],
  ["kB", 1e3],
] as const;

const BINARY_UNITS = [
  ["TiB", 1024 ** 4],
  ["GiB", 1024 ** 3],
  ["MiB", 1024 ** 2],
  ["KiB", 1024],
] as const;

/**
 * A byte limit, exactly, in decimal or binary units, whichever renders it in at most three
 * decimals: `67108864` gives `64 MiB`, `2500000000` gives `2.5 GB`.
 * - When both do, the shorter wins: `524288` gives `512 KiB`.
 * - A limit neither renders exactly stays in bytes.
 */
export function formatByteLimit(bytes: number): string {
  const candidates = [inLargestUnit(bytes, DECIMAL_UNITS), inLargestUnit(bytes, BINARY_UNITS)];
  const exact = candidates.filter((text) => text !== undefined);
  return exact.reduce((best, text) => (text.length < best.length ? text : best), `${bytes} bytes`);
}

function inLargestUnit(
  bytes: number,
  units: readonly (readonly [string, number])[],
): string | undefined {
  const unit = units.find(([, size]) => bytes >= size);
  if (unit === undefined) return undefined;
  const thousandths = (bytes * 1000) / unit[1];
  return Number.isInteger(thousandths) ? `${thousandths / 1000} ${unit[0]}` : undefined;
}

/**
 * Page numbers as runs, so a long document reads as `1–200` rather than two hundred numbers:
 * `[1, 2, 3, 5, 7, 8]` gives `1–3, 5, 7–8`. Expects them ascending and distinct, as an intake
 * entry lists them.
 */
export function formatPageRanges(pages: readonly number[]): string {
  const runs: [number, number][] = [];
  for (const page of pages) {
    const last = runs.at(-1);
    if (last && page === last[1] + 1) last[1] = page;
    else runs.push([page, page]);
  }
  return runs.map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`)).join(", ");
}
