const absoluteFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** Largest unit first; each entry is how many milliseconds one of it spans. */
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
  ["second", 1000],
];

export function formatAbsolute(iso: string): string {
  return absoluteFormat.format(new Date(iso));
}

/** `now` is passed in so a list of rows agrees on one clock and re-renders together. */
export function formatRelative(iso: string, now: number): string {
  const elapsed = new Date(iso).getTime() - now;
  const unit = UNITS.find(([, span]) => Math.abs(elapsed) >= span) ?? UNITS[UNITS.length - 1];
  return relativeFormat.format(Math.round(elapsed / unit[1]), unit[0]);
}

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
