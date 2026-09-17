import { Suspense } from "react";

import { IngestionsView } from "@/components/ingestions/ingestions-view";

/**
 * The view renders the page header itself: its filter and refresh controls sit
 * in the header's actions slot and read the same state as the table below.
 */
export default function IngestionsPage() {
  return (
    <div className="flex h-svh min-h-0 flex-col">
      <Suspense>
        <IngestionsView />
      </Suspense>
    </div>
  );
}
