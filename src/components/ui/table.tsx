"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const TableCaptionId = React.createContext<string | undefined>(undefined);

// A table in a container that scrolls sideways when the table is wider than it.
// - While it overflows, the container is a tab stop and a region, so a keyboard user can scroll it.
// - The region takes the table's `aria-label` or `aria-labelledby`, else its `TableCaption`.
function Table({
  className,
  ...props
}: React.ComponentProps<"table"> & {
  // Names the table, and its scroll container while it overflows. Leave it off when a `TableCaption` names the table.
  "aria-label"?: string;
}) {
  const container = React.useRef<HTMLDivElement>(null);
  const captionId = React.useId();
  const [overflows, setOverflows] = React.useState(false);
  const [captionLabel, setCaptionLabel] = React.useState<string>();

  React.useEffect(() => {
    const el = container.current;
    const table = el?.firstElementChild;
    if (!el || !table) return;
    const measure = () => {
      setOverflows(el.scrollWidth > el.clientWidth);
      setCaptionLabel(table.querySelector(":scope > caption")?.id || undefined);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(table);
    return () => ro.disconnect();
  }, []);

  const named = props["aria-label"] || props["aria-labelledby"];

  return (
    <div
      ref={container}
      data-slot="table-container"
      tabIndex={overflows ? 0 : undefined}
      role={overflows ? "region" : undefined}
      aria-label={overflows ? props["aria-label"] : undefined}
      aria-labelledby={overflows ? (named ? props["aria-labelledby"] : captionLabel) : undefined}
      className="relative w-full overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <TableCaptionId.Provider value={captionId}>
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </TableCaptionId.Provider>
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-foreground/3 [&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-foreground/3 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"tr"> & {
  // Tints the row on hover. Set it on a row that opens, selects or links to something; leave it off for rows of static data.
  interactive?: boolean;
}) {
  return (
    <tr
      data-slot="table-row"
      data-interactive={interactive || undefined}
      className={cn(
        "border-b transition-colors has-aria-expanded:bg-foreground/4 data-interactive:hover:bg-foreground/4 data-[state=selected]:bg-accent/15 data-[state=selected]:hover:bg-accent/15",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-12 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      id={React.useContext(TableCaptionId)}
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
