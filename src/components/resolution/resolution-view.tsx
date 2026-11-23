"use client";

import * as React from "react";

import { FactsLane } from "@/components/resolution/facts-lane";
import { ResolutionImpact } from "@/components/resolution/resolution-impact";
import { usePatient } from "@/contexts/patient-provider";
import { useActionResult } from "@/hooks/use-action-result";
import { useResolutionRoute } from "@/hooks/use-resolution-route";
import { readResolutionImpact } from "@/lib/context-engine-client/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorIcon } from "@/components/ui/icons/error";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The resolution page: what the pipeline did to this patient's records, read off the
 * graph endpoints.
 *
 * The facts resolution settled on, each opening into the merges that built it.
 *
 * Facts only: narrative passages are resolved separately, and nothing here speaks for them.
 */
export function ResolutionView() {
  const { activePatient } = usePatient();
  const registryKey = activePatient?.registryKey ?? null;
  const route = useResolutionRoute();

  const loadImpact = React.useMemo(
    () => (registryKey ? () => readResolutionImpact(registryKey) : null),
    [registryKey],
  );
  const impact = useActionResult(loadImpact);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {(impact.status === "loading" || impact.status === "idle") && (
        // Shaped like the five impact tiles.
        <div
          className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3 sm:grid-cols-5"
          aria-hidden
        >
          {Array.from({ length: 5 }, (_, tile) => (
            <Skeleton key={tile} className="h-14" />
          ))}
        </div>
      )}
      {impact.status === "loaded" && <ResolutionImpact impact={impact.data} />}
      {impact.status === "error" && (
        <div className="border-b border-border px-4 py-3">
          <Alert variant="destructive" role="note">
            <ErrorIcon />
            <AlertDescription>{impact.error}</AlertDescription>
          </Alert>
        </div>
      )}

      <FactsLane registryKey={registryKey} route={route} />
    </div>
  );
}
