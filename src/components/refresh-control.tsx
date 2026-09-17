"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ArrowDown01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Selectable auto-refresh intervals, in milliseconds.
 *
 * Stops at 30 minutes: this is a working list someone watches an ingest land
 * in, not a wall dashboard, and an interval longer than the sitting is the same
 * as off.
 */
export const REFRESH_INTERVALS_MS = [5_000, 10_000, 30_000, 60_000, 300_000, 900_000, 1_800_000];

/** `5s`, `10m` — a unit token rather than prose, so it needs no translation. */
export function formatInterval(ms: number): string {
  return ms < 60_000 ? `${ms / 1000}s` : `${ms / 60_000}m`;
}

/**
 * Refresh now, with the auto-refresh interval on an attached menu.
 *
 * Split rather than one control because the two are different decisions made at
 * different times: "show me the current state" is a reflex, the interval is set
 * once and left. The chosen interval sits on the menu half, beside the control
 * that sets it, so a page that moves on its own says why — and refreshing by
 * hand stays available at any interval, off included.
 */
export function RefreshControl({
  isRefreshing,
  onRefresh,
  intervalMs,
  onIntervalChange,
  refreshLabel,
  autoRefreshLabel,
  offLabel,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
  /** Chosen interval, or `null` for off. */
  intervalMs: number | null;
  onIntervalChange: (intervalMs: number | null) => void;
  refreshLabel: string;
  autoRefreshLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex items-center">
      <Button
        variant="outline"
        size="sm"
        className="rounded-l-lg rounded-r-none border-r-0 bg-transparent hover:bg-muted"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label={refreshLabel}
      >
        <HugeiconsIcon
          icon={RefreshIcon}
          strokeWidth={2}
          className={isRefreshing ? "animate-spin" : undefined}
        />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "rounded-l-none rounded-r-lg bg-transparent hover:bg-muted",
                intervalMs === null ? "px-1.5" : "pr-1.5 pl-2",
              )}
            />
          }
          aria-label={autoRefreshLabel}
        >
          {intervalMs !== null && (
            <span className="tabular-nums">{formatInterval(intervalMs)}</span>
          )}
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          {/* The label is a group part: Base UI throws without this wrapper. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {autoRefreshLabel}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={intervalMs === null ? "off" : String(intervalMs)}
            onValueChange={(value) =>
              onIntervalChange(value === "off" ? null : Number.parseInt(value, 10))
            }
          >
            <DropdownMenuRadioItem value="off">{offLabel}</DropdownMenuRadioItem>
            {REFRESH_INTERVALS_MS.map((ms) => (
              <DropdownMenuRadioItem key={ms} value={String(ms)} className="tabular-nums">
                {formatInterval(ms)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
