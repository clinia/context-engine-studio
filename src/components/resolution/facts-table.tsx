"use client";

import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResolvedFact } from "@/lib/context-engine-client/actions";

/**
 * The facts resolution settled on. The endpoint offers no sort, so there is no sort
 * control — the order is the graph's own.
 *
 * Every column is read off the fact node itself. Sources, support and the deciding rule
 * live on the member records and the decision edges, and reading them per row would be
 * requests per fact, so they are in the detail panel instead.
 */
export function FactsTable({
  facts,
  selectedId,
  onSelect,
}: {
  facts: ResolvedFact[];
  selectedId: string | null;
  onSelect: (factId: string) => void;
}) {
  const t = useTranslations("resolution");

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("columnFact")}</TableHead>
          <TableHead>{t("columnType")}</TableHead>
          <TableHead className="text-right">{t("columnMembers")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {facts.map((fact) => {
          const count = fact.memberIds.length;
          return (
            <TableRow
              key={fact.id}
              data-selected={fact.id === selectedId || undefined}
              onClick={() => onSelect(fact.id)}
              className="cursor-pointer"
            >
              <TableCell className="max-w-96 truncate" title={fact.display}>
                {fact.display}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{fact.type}</TableCell>
              <TableCell className="text-right tabular-nums">
                {count === 1 ? (
                  <span className="text-muted-foreground">1</span>
                ) : (
                  <span className="font-medium">{count}</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
