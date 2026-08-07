"use client";

import { Fragment } from "react";

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { patientLabel, usePatient } from "@/contexts/patient-provider";
import { useVfsRoute } from "@/hooks/use-vfs-route";

export function PatientBreadcrumb() {
  const { activePatient } = usePatient();
  const { selectedPath, clearSelection } = useVfsRoute();

  const label = activePatient ? patientLabel(activePatient) : "Select a patient";
  const segments = selectedPath ? selectedPath.split("/").filter(Boolean) : [];

  return (
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
          <Fragment key={`${index}-${segment}`}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {isLast ? (
                <BreadcrumbPage className="line-clamp-1">{segment}</BreadcrumbPage>
              ) : (
                <span className="line-clamp-1">{segment}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        );
      })}
    </BreadcrumbList>
  );
}
