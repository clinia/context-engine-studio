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
