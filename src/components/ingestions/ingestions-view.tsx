"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { IngestionDetailPanel } from "@/components/ingestions/ingestion-detail-panel";
import { IngestionsTable } from "@/components/ingestions/ingestions-table";
import { IngestionStatusBadge } from "@/components/ingestions/ingestion-status-badge";
import { NavActions } from "@/components/nav-actions";
import { PageHeader } from "@/components/page-header";
import { RefreshControl } from "@/components/refresh-control";
import type { FilterDefinition, SortDefinition } from "@/components/table-filter/definitions";
import { FilterButton } from "@/components/table-filter/filter-button";
import { FilterSortBar } from "@/components/table-filter/filter-sort-bar";
import { Button } from "@/components/ui/button";
import { usePatient } from "@/contexts/patient-provider";
import {
  DEFAULT_INGESTION_ORDER,
  INGESTION_STATUSES,
  INGESTIONS_PER_PAGE,
  useIngestionsRoute,
} from "@/hooks/use-ingestions-route";
import { listIngestions } from "@/lib/context-engine-client/actions";
import { attempt } from "@/lib/result";
import type { Ingestion, IngestionStatus } from "@clinia/context-engine-js";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type ListState =
  | { status: "loading" }
  | { status: "loaded"; ingestions: Ingestion[]; total: number }
  | { status: "error"; error: string };

/** How often relative times tick, independent of whether the list re-reads. */
const CLOCK_INTERVAL_MS = 30_000;

/**
 * The ingestions page: a filtered, sorted page of this patient's submissions
 * with the selected one's detail beside it. Both the query and the selection
 * live in the URL — see {@link useIngestionsRoute}.
 *
 * An ingest settles on the server with nothing to tell the browser about it, so
 * a page goes stale where it stands. The toolbar's auto-refresh is the answer
 * and is off by default: the list re-reads on the chosen interval, or only when
 * refresh is pressed.
 */
export function IngestionsView() {
  const t = useTranslations("ingestions");
  const { activePatient } = usePatient();
  const patientId = activePatient?.registryKey ?? null;
  const { status, order, page, selectedId, setStatus, setOrder, setPage, select, clearSelection } =
    useIngestionsRoute();

  const [state, setState] = React.useState<ListState>({ status: "loading" });
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [refreshIntervalMs, setRefreshIntervalMs] = React.useState<number | null>(null);

  // The filter re-derived from a scalar, so the fetch effect re-runs on a
  // changed filter rather than on every new array identity from the URL.
  const statusKey = status.join(",");
  const statuses = React.useMemo(
    () => (statusKey === "" ? [] : (statusKey.split(",") as IngestionStatus[])),
    [statusKey],
  );

  const load = React.useCallback(
    async (signal: { cancelled: boolean }) => {
      if (!patientId) {
        // The patient layout 404s an id that is not in the list, so this is the
        // patient going away under an already-open view rather than a bad URL.
        // Terminal either way: nothing else would move the page off "loading".
        setState({ status: "error", error: t("patientUnavailable") });
        return;
      }
      const result = await attempt(
        listIngestions(patientId, {
          page,
          perPage: INGESTIONS_PER_PAGE,
          order,
          status: statuses,
        }),
      );
      if (signal.cancelled) return;

      setNow(Date.now());
      if (result.ok) {
        setState({
          status: "loaded",
          ingestions: result.data.data,
          total: result.data.meta.total,
        });
      } else {
        setState({ status: "error", error: result.error });
      }
    },
    [patientId, page, order, statuses, t],
  );

  // The in-flight query's cancellation flag, replaced whenever `load` changes
  // identity. A refresh or a poll started under the old filter, sort or page
  // reads the flag its own query was issued under, so a response that lands
  // after the query moved on is dropped instead of overwriting the newer page.
  const queryRef = React.useRef<{ cancelled: boolean }>({ cancelled: false });

  React.useEffect(() => {
    const signal = { cancelled: false };
    queryRef.current = signal;
    setState({ status: "loading" });
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  React.useEffect(() => {
    if (refreshIntervalMs === null) return;
    const timer = setInterval(() => void load(queryRef.current), refreshIntervalMs);
    return () => clearInterval(timer);
  }, [refreshIntervalMs, load]);

  // Relative timestamps go stale on their own once polling stops.
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await load(queryRef.current);
    setIsRefreshing(false);
  }, [load]);

  // The filterable columns, in one place so the bar and the headers edit the
  // same thing. `FilterDefinition` is string-valued because every filter is
  // membership in a closed vocabulary, so this is where `IngestionStatus` is
  // narrowed back — a second filterable column adds an entry here and nothing
  // else.
  const filters: FilterDefinition[] = React.useMemo(
    () => [
      {
        id: "status",
        label: t("columnStatus"),
        options: INGESTION_STATUSES,
        selected: status,
        onChange: (selected) => setStatus(selected as IngestionStatus[]),
        renderValue: (value) => <IngestionStatusBadge status={value as IngestionStatus} />,
      },
    ],
    [t, status, setStatus],
  );

  const sorts: SortDefinition[] = React.useMemo(
    () => [
      {
        id: "receivedAt",
        label: t("columnReceived"),
        direction: order,
        onDirectionChange: setOrder,
        defaultDirection: DEFAULT_INGESTION_ORDER,
      },
    ],
    [t, order, setOrder],
  );

  const menuLabels = {
    clear: t("filterClear"),
    sort: t("sort"),
    sortAscending: t("sortOldestFirst"),
    sortDescending: t("sortNewestFirst"),
  };

  const ingestions = state.status === "loaded" ? state.ingestions : [];
  const total = state.status === "loaded" ? state.total : null;
  const selected = ingestions.find((item) => item.ingestionId === selectedId) ?? null;
  const lastPage = total === null ? 0 : Math.max(0, Math.ceil(total / INGESTIONS_PER_PAGE) - 1);

  return (
    <>
      <PageHeader
        actions={
          <>
            <FilterButton
              filters={filters}
              labels={{ ...menuLabels, filter: t("filterAdd"), clearAll: t("filterClearAll") }}
            />
            <RefreshControl
              isRefreshing={isRefreshing}
              onRefresh={() => void refresh()}
              intervalMs={refreshIntervalMs}
              onIntervalChange={setRefreshIntervalMs}
              refreshLabel={t("refresh")}
              autoRefreshLabel={t("autoRefresh")}
              offLabel={t("autoRefreshOff")}
            />
            <NavActions />
          </>
        }
      />
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <FilterSortBar
            sorts={sorts}
            filters={filters}
            labels={{ ...menuLabels, addFilter: t("filterAdd"), reset: t("filterReset") }}
            className="border-b border-border px-4 py-2"
            trailing={
              total !== null && (
                <span className="text-xs text-muted-foreground">
                  {t("resultCount", { count: total })}
                </span>
              )
            }
          />

          <div className="min-h-0 flex-1 overflow-auto">
            {state.status === "loading" && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
            )}
            {state.status === "error" && (
              <p className="px-4 py-10 text-center text-sm text-destructive">{state.error}</p>
            )}
            {state.status === "loaded" &&
              (ingestions.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {status.length === 0 ? t("empty") : t("emptyFiltered")}
                </p>
              ) : (
                <IngestionsTable
                  ingestions={ingestions}
                  selectedId={selectedId}
                  onSelect={select}
                  now={now}
                  filters={filters}
                  sorts={sorts}
                  menuLabels={menuLabels}
                />
              ))}
          </div>

          {lastPage > 0 && (
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {t("pageOf", { page: page + 1, pages: lastPage + 1 })}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                aria-label={t("previousPage")}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={page >= lastPage}
                onClick={() => setPage(page + 1)}
                aria-label={t("nextPage")}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
            </div>
          )}
        </div>

        {selected && (
          <aside className="absolute inset-y-0 right-0 z-20 w-full border-l border-border bg-background md:static md:z-auto md:w-[26rem] md:shrink-0">
            <IngestionDetailPanel ingestion={selected} onClose={clearSelection} now={now} />
          </aside>
        )}
      </div>
    </>
  );
}
