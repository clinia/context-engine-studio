"use client";

import {
  type FilterDefinition,
  isFilterActive,
  type SortDefinition,
} from "@/components/table-filter/definitions";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** Values a chip or column title shows before the rest collapse into `+N`. */
const VISIBLE_VALUES = 2;

export type FilterMenuLabels = {
  clear: string;
  sortAscending: string;
  sortDescending: string;
  sort: string;
};

/**
 * The direction choice for one sortable column, as menu parts.
 *
 * Parts rather than a whole menu so a column that both sorts and filters offers
 * one menu with both, instead of two the reader has to choose between.
 */
export function SortMenuItems({
  definition,
  labels,
}: {
  definition: SortDefinition;
  labels: FilterMenuLabels;
}) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="text-xs text-muted-foreground">{labels.sort}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={definition.direction}
        onValueChange={(value) =>
          definition.onDirectionChange(value as SortDefinition["direction"])
        }
      >
        <DropdownMenuRadioItem value="asc">
          <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-3.5" />
          {labels.sortAscending}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="desc">
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-3.5" />
          {labels.sortDescending}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}

/** The value choice for one filterable column, as menu parts. */
export function FilterMenuItems({
  definition,
  labels,
}: {
  definition: FilterDefinition;
  labels: FilterMenuLabels;
}) {
  const toggle = (value: string, checked: boolean) =>
    definition.onChange(
      checked
        ? [...definition.selected, value]
        : definition.selected.filter((current) => current !== value),
    );

  return (
    <>
      {/* The label is a group part: Base UI throws without this wrapper. */}
      <DropdownMenuGroup>
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {definition.label}
        </DropdownMenuLabel>
        {definition.options.map((value) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={definition.selected.includes(value)}
            onCheckedChange={(checked) => toggle(value, checked)}
          >
            {definition.renderValue(value)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        disabled={!isFilterActive(definition)}
        onClick={() => definition.onChange([])}
      >
        {labels.clear}
      </DropdownMenuItem>
    </>
  );
}

/**
 * A filter's selected values, in `options` order so the row does not reshuffle
 * as the selection changes.
 */
export function FilterValues({ definition }: { definition: FilterDefinition }) {
  const active = definition.options.filter((option) => definition.selected.includes(option));
  const overflow = active.length - VISIBLE_VALUES;

  return (
    <>
      {active.slice(0, VISIBLE_VALUES).map((value) => (
        <span key={value}>{definition.renderValue(value)}</span>
      ))}
      {overflow > 0 && <Badge variant="muted">+{overflow}</Badge>}
    </>
  );
}
