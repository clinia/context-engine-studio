"use client";

import {
  type FilterDefinition,
  isFilterActive,
  type SortDefinition,
} from "@/components/table-filter/definitions";
import {
  type FilterMenuLabels,
  FilterMenuItems,
  SortMenuItems,
} from "@/components/table-filter/filter-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowDown01Icon, ArrowUp01Icon, FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * A column title, and the sorting and filtering reachable from it.
 *
 * The second entry point onto the same definitions the toolbar button offers —
 * a column is where the reader already is when they decide to narrow by it, so
 * the menu opens on the title rather than only above the table. A column with
 * neither is a plain title and stays unclickable, so a menu cursor means there
 * is a menu.
 *
 * The trailing icon states what is already on: the sort direction, or the
 * funnel once the column is filtered, with filtering winning the one slot
 * because it hides rows and sorting only moves them.
 */
export function ColumnHeader({
  label,
  sort,
  filter,
  labels,
  className,
}: {
  label: string;
  sort?: SortDefinition;
  filter?: FilterDefinition;
  labels: FilterMenuLabels;
  className?: string;
}) {
  if (!sort && !filter) {
    return <TableHead className={className}>{label}</TableHead>;
  }

  const filtered = filter !== undefined && isFilterActive(filter);
  const icon = filtered ? FilterIcon : sort?.direction === "asc" ? ArrowUp01Icon : ArrowDown01Icon;

  return (
    <TableHead className={cn("p-0", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex h-full w-full items-center gap-1 px-3 py-2 text-left hover:text-foreground"
            />
          }
        >
          {label}
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className={cn("size-3", filtered || sort ? "text-foreground" : "opacity-50")}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          {sort && <SortMenuItems definition={sort} labels={labels} />}
          {sort && filter && <DropdownMenuSeparator />}
          {filter && <FilterMenuItems definition={filter} labels={labels} />}
        </DropdownMenuContent>
      </DropdownMenu>
    </TableHead>
  );
}
