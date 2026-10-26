"use client";

import { Badge } from "@/components/ui/badge";
import type { ExtractedRecord } from "@/lib/context-engine-client/actions";

/** Extracted records keyed by id, as far as they could be read. */
export type Records = Record<string, ExtractedRecord>;

/**
 * `origin/ref` is how a record is addressed at its source, and the only name it has; the
 * record's id stands in until it has been read.
 */
export function recordLabel(id: string, records: Records): string {
  const source = records[id]?.source;
  return source ? `${source.origin}/${source.ref}` : id;
}

/** A record's own wording, with where it came from on hover; its id until it has been read. */
export function RecordName({ id, records }: { id: string; records: Records }) {
  const record = records[id];
  if (!record) return <span className="font-mono">{id}</span>;
  return <span title={recordLabel(id, records)}>{record.display}</span>;
}

/**
 * Which record a row came from, as the tail of its source reference: the end of the id is
 * what tells two records from one feed apart. The full reference is on hover.
 */
export function SourceTag({ id, records }: { id: string; records: Records }) {
  const ref = records[id]?.source.ref ?? id;
  const tail = ref.length > 12 ? `…${ref.slice(-8)}` : ref;
  return (
    <span className="shrink-0 font-mono text-muted-foreground" title={recordLabel(id, records)}>
      {tail}
    </span>
  );
}

/**
 * Known code systems under the name a clinician would use, matched on a substring of the
 * URI, slug or OID. Unrecognized systems are shown as-is.
 */
const SYSTEM_NAMES: [pattern: string, name: string][] = [
  ["snomed", "SNOMED"],
  ["loinc", "LOINC"],
  ["rxnorm", "RxNorm"],
  ["icd-10", "ICD-10"],
  ["icd-9", "ICD-9"],
  ["sid/ndc", "NDC"],
  ["cvx", "CVX"],
  ["unii", "UNII"],
];

export function formatCodeSystem(system: string): string {
  const lower = system.toLowerCase();
  const known = SYSTEM_NAMES.find(([pattern]) => lower.includes(pattern));
  if (known) return known[1];
  // An OID keeps only its final arc; the registry prefix is the same on every one.
  const oid = /^urn:oid:(.+)$/.exec(system);
  if (oid) return `OID ${oid[1]}`;
  return system;
}

/** A record's dates, as an instant or a range. */
function formatWhen(when: ExtractedRecord["when"]): string | null {
  if (!when) return null;
  if (when.start && when.end) return `${when.start} → ${when.end}`;
  return when.start ?? when.end ?? null;
}

/** A code under the name of its system, e.g. "SNOMED 38341003", with the source's wording on hover. */
export function CodeText({
  system,
  code,
  display,
}: {
  system: string;
  code: string;
  display?: string | null;
}) {
  return (
    <span className="font-mono whitespace-nowrap" title={display ?? system}>
      <span className="text-muted-foreground">{formatCodeSystem(system)}</span> {code}
    </span>
  );
}

/**
 * One extracted record in two lines: the wording the source used and its status, then the
 * codes a rule could have matched on, when it applied, and where it came from.
 *
 * Falls back to the bare id when the record could not be read, so a row never vanishes
 * for want of a name.
 */
export function RecordDetail({
  record,
  fallbackId,
}: {
  record: ExtractedRecord | undefined;
  fallbackId: string;
}) {
  if (!record) {
    return <p className="font-mono text-xs break-all text-muted-foreground">{fallbackId}</p>;
  }

  const when = formatWhen(record.when);

  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 text-sm break-words">{record.display}</span>
        {record.status && (
          <Badge variant="muted" className="shrink-0">
            {record.status}
          </Badge>
        )}
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {record.codes.map((coding) => (
          <CodeText
            key={`${coding.system}-${coding.code}`}
            system={coding.system}
            code={coding.code}
            display={coding.display}
          />
        ))}
        {when && <span className="text-muted-foreground tabular-nums">{when}</span>}
        <span className="font-mono break-all text-muted-foreground">{record.source.ref}</span>
      </p>
    </div>
  );
}
