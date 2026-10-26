import type { ExtractedRecord } from "@/lib/context-engine-client/actions";

/** The records one source contributed to a fact. */
export type SourceGroup = {
  /** `type · origin`, which identifies a feed; `null` for records that could not be read. */
  label: string | null;
  memberIds: string[];
};

/** Groups a fact's members by the source their record names. Unread records share one group. */
export function groupMembersBySource(
  memberIds: readonly string[],
  records: Readonly<Record<string, ExtractedRecord>>,
): SourceGroup[] {
  const groups = new Map<string | null, SourceGroup>();

  for (const id of memberIds) {
    const source = records[id]?.source;
    const label = source ? `${source.type} · ${source.origin}` : null;
    const existing = groups.get(label);
    if (existing) existing.memberIds.push(id);
    else groups.set(label, { label, memberIds: [id] });
  }

  return [...groups.values()].sort((a, b) => b.memberIds.length - a.memberIds.length);
}
