"use client";

import { type FilterDefinition, isFilterActive } from "@/components/table-filter/definitions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { type FilterMenuLabels, FilterMenuItems } from "@/components/table-filter/filter-menu";
import { FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Every filter the table has, from the page header.
 *
 * Sits with the page's other icon actions rather than over the table, because
 * it is the way in when no filter is set yet and there is no bar to put it on.
 * A dot marks that something is filtered, so the header says the table is not
 * showing everything even with the bar scrolled out of view.
 */
export function FilterButton({
  filters,
  labels,
}: {
  filters: FilterDefinition[];
  labels: FilterMenuLabels & { filter: string; clearAll: string };
}) {
  const active = filters.filter(isFilterActive);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative h-7 w-7" />}
        aria-label={labels.filter}
      >
        <HugeiconsIcon icon={FilterIcon} strokeWidth={2} />
        {active.length > 0 && (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {filters.map((definition) => (
          <DropdownMenuSub key={definition.id}>
            <DropdownMenuSubTrigger>{definition.label}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-48">
              <FilterMenuItems definition={definition} labels={labels} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
        {active.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => active.forEach((definition) => definition.onChange([]))}
            >
              {labels.clearAll}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
