import type { ResolutionLevel } from "@/lib/context-engine-client/graph-payloads";

/** Resolution levels, strongest first. */
export const RESOLUTION_LEVELS: readonly ResolutionLevel[] = ["confirmed", "probable", "uncertain"];

/** Resolution levels, weakest first. */
export const WEAKEST_FIRST: readonly ResolutionLevel[] = [...RESOLUTION_LEVELS].reverse();

/** 0 for the strongest level; higher is weaker. */
export function levelRank(level: ResolutionLevel): number {
  return RESOLUTION_LEVELS.indexOf(level);
}

/** How many of `items` carry each level. Levels with none are left out. */
export function countLevels<T>(
  items: Iterable<T>,
  levelOf: (item: T) => ResolutionLevel,
): Partial<Record<ResolutionLevel, number>> {
  const counts: Partial<Record<ResolutionLevel, number>> = {};
  for (const item of items) {
    const level = levelOf(item);
    counts[level] = (counts[level] ?? 0) + 1;
  }
  return counts;
}
