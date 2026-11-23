"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { ErrorIcon } from "@/components/ui/icons/error";
import { InfoIcon } from "@/components/ui/icons/info";
import { StacksIcon } from "@/components/ui/icons/stacks";
import { Skeleton } from "@/components/ui/skeleton";
import * as React from "react";

import { FactDetailPanel } from "@/components/resolution/fact-detail-panel";
import { FactsTable } from "@/components/resolution/facts-table";
import { PaginationFooter } from "@/components/resolution/pagination-footer";
import { ResizableAside } from "@/components/resolution/resizable-aside";
import { useActionResult } from "@/hooks/use-action-result";
import { FACTS_PER_PAGE, type ResolutionRoute } from "@/hooks/use-resolution-route";
import { listResolvedFacts, readResolvedFact } from "@/lib/context-engine-client/actions";

/**
 * The facts lane: a page of what resolution settled on, with the selected one's whole
 * audit trail beside it.
 *
 * The row holds the fact's members and field verdicts; the panel reads the member records
 * and the decisions touching them when it opens.
 */
export function FactsLane({
  registryKey,
  route,
}: {
  registryKey: string | null;
  route: ResolutionRoute;
}) {
  const t = useTranslations("resolution");
  const { page, factId, setPage, selectFact, clearSelection } = route;
  const loadPage = React.useMemo(
    () =>
      registryKey ? () => listResolvedFacts(registryKey, { page, perPage: FACTS_PER_PAGE }) : null,
    [registryKey, page],
  );
  const state = useActionResult(loadPage);

  const facts = state.status === "loaded" ? state.data.facts : [];
  const total = state.status === "loaded" ? state.data.total : null;
  const onPage = facts.find((fact) => fact.id === factId) ?? null;

  // A selected fact that is not on this page, as a shared link can name.
  const offPageId = state.status === "loaded" && !onPage ? factId : null;
  const loadOffPage = React.useMemo(
    () => (registryKey && offPageId ? () => readResolvedFact(registryKey, offPageId) : null),
    [registryKey, offPageId],
  );
  const offPage = useActionResult(loadOffPage);
  const offPageMissing =
    offPage.status === "error" || (offPage.status === "loaded" && offPage.data === null);
  const selected = onPage ?? (offPage.status === "loaded" ? offPage.data : null);

  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The table scrolls inside its own container, so its header can stick. */}
        <div className="min-h-0 flex-1 overflow-auto [&>[data-slot=table-container]]:max-h-full">
          {offPageMissing && (
            <div className="px-4 pt-4">
              <Alert role="note">
                <InfoIcon />
                <AlertDescription>{t("factNotFound")}</AlertDescription>
              </Alert>
            </div>
          )}
          {(state.status === "loading" || state.status === "idle") && (
            // Shaped like the table's rows.
            <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true">
              <span className="sr-only">{t("loading")}</span>
              {Array.from({ length: 8 }, (_, row) => (
                <Skeleton key={row} className="h-7 w-full" />
              ))}
            </div>
          )}
          {state.status === "error" && (
            <div className="p-4">
              <Alert variant="destructive" role="note">
                <ErrorIcon />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            </div>
          )}
          {state.status === "loaded" &&
            (facts.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <StacksIcon />
                  </EmptyMedia>
                  <EmptyDescription>{t("emptyFacts")}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <FactsTable facts={facts} selectedId={factId} onSelect={selectFact} />
            ))}
        </div>

        <PaginationFooter
          page={page}
          total={total}
          perPage={FACTS_PER_PAGE}
          onPageChange={setPage}
        />
      </div>

      {selected && (
        <ResizableAside>
          <FactDetailPanel fact={selected} registryKey={registryKey} onClose={clearSelection} />
        </ResizableAside>
      )}
    </div>
  );
}
