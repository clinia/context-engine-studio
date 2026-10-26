import { Suspense } from "react";

import { NavActions } from "@/components/nav-actions";
import { PageHeader } from "@/components/page-header";
import { ResolutionView } from "@/components/resolution/resolution-view";

export default function ResolutionPage() {
  return (
    <div className="flex h-svh min-h-0 flex-col">
      <PageHeader actions={<NavActions />} />
      <Suspense>
        <ResolutionView />
      </Suspense>
    </div>
  );
}
