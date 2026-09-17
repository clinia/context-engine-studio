import type * as React from "react";

/**
 * One filterable column, as everything that can reach a filter sees it — the
 * header button, the column title, the bar that states the result.
 *
 * The definition owns its own state rather than reporting it upward, so two
 * entry points onto the same filter are the same call and cannot drift. One
 * definition per column lives beside the table it belongs to.
 *
 * Values are strings because every filter here is membership in a closed
 * vocabulary. A range or free-text filter is a second shape, not an operator
 * field bolted onto this one.
 */
export type FilterDefinition = {
  /** The column filtered, and the key the bar tracks it by. */
  id: string;
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** How one value renders wherever it is shown: menu, chip, column title. */
  renderValue: (value: string) => React.ReactNode;
};

export type SortDirection = "asc" | "desc";

/**
 * One sortable column. Direction only: a table sorted on a field it cannot
 * unsort has no third state to offer.
 */
export type SortDefinition = {
  /** The column sorted, matching the {@link FilterDefinition} id where both exist. */
  id: string;
  label: string;
  direction: SortDirection;
  onDirectionChange: (direction: SortDirection) => void;
  /** The direction the table loads with, and the one `Reset` returns to. */
  defaultDirection: SortDirection;
};

export function isFilterActive(definition: FilterDefinition): boolean {
  return definition.selected.length > 0;
}

export function isSortDefault(definition: SortDefinition): boolean {
  return definition.direction === definition.defaultDirection;
}
