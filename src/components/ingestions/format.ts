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
