import { Suspense } from "react";

import { NavActions } from "@/components/nav-actions";
import { PageHeader } from "@/components/page-header";
import { VfsFileViewer } from "@/components/vfs-file-viewer";

export default function PatientPage() {
  return (
    <div className="flex h-svh min-h-0 flex-col">
      <PageHeader actions={<NavActions />} />
      <Suspense>
        <VfsFileViewer />
      </Suspense>
    </div>
  );
}
