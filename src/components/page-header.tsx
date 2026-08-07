"use client";

import * as React from "react";

import { PatientBreadcrumb } from "@/components/patient-breadcrumb";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * The shared content header (sidebar trigger + patient breadcrumb) with a
 * right-hand `actions` slot. Rendered per page rather than by the patient
 * layout, so each page controls what sits in the bar.
 */
export function PageHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <React.Suspense>
            <PatientBreadcrumb />
          </React.Suspense>
        </Breadcrumb>
      </div>
      {actions ? <div className="ml-auto flex items-center gap-3 px-3">{actions}</div> : null}
    </header>
  );
}
