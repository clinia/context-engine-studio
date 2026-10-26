"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Page controls for a lane, hidden entirely when everything fits on one page.
 *
 * `page` is zero-indexed like the endpoints' own, and displayed one-indexed.
 */
export function PaginationFooter({
  page,
  total,
  perPage,
  onPageChange,
}: {
  page: number;
  /** Matching rows across all pages, or `null` while none has loaded. */
  total: number | null;
  perPage: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("resolution");
  const lastPage = total === null ? 0 : Math.max(0, Math.ceil(total / perPage) - 1);

  if (lastPage === 0) return null;

  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
      <span className="text-xs text-muted-foreground">
        {t("pageOf", { page: page + 1, pages: lastPage + 1 })}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        aria-label={t("previousPage")}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={page >= lastPage}
        onClick={() => onPageChange(page + 1)}
        aria-label={t("nextPage")}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
      </Button>
    </div>
  );
}
