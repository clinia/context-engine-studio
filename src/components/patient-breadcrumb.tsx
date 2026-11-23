"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { patientLabel, usePatient } from "@/contexts/patient-provider";
import { useVfsRoute } from "@/hooks/use-vfs-route";
import { useVfsSegments } from "@/hooks/use-vfs-segments";
import type { VfsPath } from "@/lib/vfs-path";

/** Each segment of `path` by its display, or as it is when it has none or until it loads. */
function useVfsLabels(patientId: string | null, path: VfsPath | null): string[] {
  return useVfsSegments(patientId && path ? { patientId, path } : null).map(
    ({ name, display }) => display ?? name,
  );
}

export function PatientBreadcrumb() {
  const t = useTranslations("ingestions");
  const tResolution = useTranslations("resolution");
  const tSwitcher = useTranslations("patientSwitcher");
  const { activePatient } = usePatient();
  const { selectedPath, clearSelection } = useVfsRoute();
  const pathname = usePathname();
  const vfsLabels = useVfsLabels(activePatient?.registryKey ?? null, selectedPath);

  const label = activePatient ? patientLabel(activePatient) : tSwitcher("selectPatient");
  // Pages outside the VFS tree carry their own label.
  const pageLabel = pathname.endsWith("/ingestions")
    ? t("navLabel")
    : pathname.endsWith("/resolution")
      ? tResolution("navLabel")
      : null;
  const segments = pageLabel ? [pageLabel] : vfsLabels;

  return (
    <>
      {/* The page's heading for screen readers; an open file's viewer has a visible one. */}
      {(pageLabel || !selectedPath) && <h1 className="sr-only">{pageLabel ?? label}</h1>}
      <BreadcrumbList>
        <BreadcrumbItem>
          {segments.length === 0 ? (
            <BreadcrumbPage className="line-clamp-1">{label}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink
              render={<button type="button" onClick={clearSelection} />}
              className="line-clamp-1 cursor-pointer appearance-none border-0 bg-transparent p-0 font-[inherit]"
            >
              {label}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <React.Fragment key={`${index}-${segment}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="line-clamp-1">{segment}</BreadcrumbPage>
                ) : (
                  <span className="line-clamp-1">{segment}</span>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </>
  );
}
