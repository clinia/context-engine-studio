"use client";

import { useTranslations } from "next-intl";

import { formatAbsolute, formatDuration, formatRelative } from "@/components/ingestions/format";
import { IngestionStatusBadge } from "@/components/ingestions/ingestion-status-badge";
import { ColumnHeader } from "@/components/table-filter/column-header";
import type { FilterDefinition, SortDefinition } from "@/components/table-filter/definitions";
import type { FilterMenuLabels } from "@/components/table-filter/filter-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Ingestion } from "@clinia/context-engine-js";

/** Sum of the three staged counts, which is what the row has room for. */
function stagedTotal({ staged }: Ingestion): number {
  return staged.facts + staged.events + staged.narratives;
}

export function IngestionsTable({
  ingestions,
  selectedId,
  onSelect,
  now,
  filters,
  sorts,
  menuLabels,
}: {
  ingestions: Ingestion[];
  selectedId: string | null;
  onSelect: (ingestionId: string) => void;
  /** Shared clock for every relative timestamp in the page. */
  now: number;
  /** Filterable columns, matched to their column by `id`. */
  filters: FilterDefinition[];
  /** Sortable columns, matched to their column by `id`. */
  sorts: SortDefinition[];
  menuLabels: FilterMenuLabels;
}) {
  const t = useTranslations("ingestions");
  const filterFor = (id: string) => filters.find((definition) => definition.id === id);
  const sortFor = (id: string) => sorts.find((definition) => definition.id === id);

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <ColumnHeader
            label={t("columnStatus")}
            filter={filterFor("status")}
            labels={menuLabels}
          />
          <TableHead>{t("columnSource")}</TableHead>
          <TableHead>{t("columnStaged")}</TableHead>
          <TableHead>{t("columnDuration")}</TableHead>
          <ColumnHeader
            label={t("columnReceived")}
            sort={sortFor("receivedAt")}
            filter={filterFor("receivedAt")}
            labels={menuLabels}
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingestions.map((ingestion) => {
          const duration = formatDuration(ingestion.startedAt, ingestion.completedAt);
          return (
            <TableRow
              key={ingestion.ingestionId}
              data-selected={ingestion.ingestionId === selectedId || undefined}
              onClick={() => onSelect(ingestion.ingestionId)}
              // Focusable and activatable, so opening a submission does not
              // require a mouse. No `role="button"`: that would replace the
              // row's own role and take its cells out of the accessibility
              // tree, costing a screen reader the columns to read the
              // submission by.
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelect(ingestion.ingestionId);
              }}
              className="cursor-pointer focus-visible:bg-muted focus-visible:outline-none"
            >
              <TableCell>
                <IngestionStatusBadge status={ingestion.status} />
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {ingestion.source}
              </TableCell>
              <TableCell className="tabular-nums">{stagedTotal(ingestion)}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {duration ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap" title={formatAbsolute(ingestion.receivedAt)}>
                {formatRelative(ingestion.receivedAt, now)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
