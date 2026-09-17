"use client";

import {
  type FilterDefinition,
  isFilterActive,
  isSortDefault,
  type SortDefinition,
} from "@/components/table-filter/definitions";
import {
  type FilterMenuLabels,
  FilterMenuItems,
  FilterValues,
  SortMenuItems,
} from "@/components/table-filter/filter-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ArrowDown01Icon, ArrowUp01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Squarer, and carried by its border rather than a fill.
 *
 * No surface colour of its own: `--card` is the one cold value in a warm
 * palette — pure white against a cream `--background` it is two units from — and
 * the `outline` variant's default `bg-input/30` is 30% of the border grey, which
 * muddies rather than lifts. Transparent leaves the border to say the chip is a
 * set filter and `hover:bg-muted` to say it is live, which is what the adjacent
 * add button already does. Scoped here rather than changed on `Button`, which
 * every screen in the studio uses.
 */
const CHIP = "h-7 rounded-lg border-border bg-transparent px-2 text-xs hover:bg-muted";

function SortChip({
  definition,
  labels,
}: {
  definition: SortDefinition;
  labels: FilterMenuLabels;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className={CHIP} />}>
        <HugeiconsIcon
          icon={definition.direction === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
          strokeWidth={2}
          className="size-3"
        />
        {definition.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <SortMenuItems definition={definition} labels={labels} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterChip({
  definition,
  labels,
}: {
  definition: FilterDefinition;
  labels: FilterMenuLabels;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className={CHIP} />}>
        <span className="text-muted-foreground">{definition.label}</span>
        <FilterValues definition={definition} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <FilterMenuItems definition={definition} labels={labels} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * What the table is currently showing: its sort, then its active filters, each
 * editable where it is stated.
 *
 * The row both entry points resolve to — a filter set from the page header and
 * one set from its column land in the same chip, so there is one place that
 * answers "why am I seeing these rows". Only active filters take a chip; the
 * whole vocabulary sitting here permanently would read as a filtered table that
 * is not.
 */
export function FilterSortBar({
  sorts,
  filters,
  labels,
  trailing,
  className,
}: {
  sorts: SortDefinition[];
  filters: FilterDefinition[];
  labels: FilterMenuLabels & { addFilter: string; reset: string };
  /** Right-aligned slot: the result count, and anything else about the result. */
  trailing?: React.ReactNode;
  className?: string;
}) {
  const active = filters.filter(isFilterActive);
  const available = filters.filter((definition) => !isFilterActive(definition));
  const canReset = active.length > 0 || !sorts.every(isSortDefault);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {sorts.map((definition) => (
        <SortChip key={definition.id} definition={definition} labels={labels} />
      ))}

      {active.map((definition) => (
        <FilterChip key={definition.id} definition={definition} labels={labels} />
      ))}

      {available.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
              />
            }
          >
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-3" />
            {labels.addFilter}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-40">
            {available.map((definition) => (
              <DropdownMenuItem
                key={definition.id}
                onClick={() => definition.onChange([...definition.options])}
              >
                {definition.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="ml-auto flex items-center gap-2">
        {trailing}
        {canReset && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
            onClick={() => {
              active.forEach((definition) => definition.onChange([]));
              sorts.forEach((sort) => sort.onDirectionChange(sort.defaultDirection));
            }}
          >
            {labels.reset}
          </Button>
        )}
      </div>
    </div>
  );
}
