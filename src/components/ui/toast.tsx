"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** Adds toasts from anywhere under {@link ToastProvider}. */
const useToast = ToastPrimitive.useToastManager;

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

/**
 * The bottom-right stack. Renders every toast the manager holds, newest last,
 * and must sit inside a {@link ToastProvider} — one per app, near the root, so
 * a toast survives the navigation that raised it.
 *
 * A toast over the provider's `limit` keeps its slot in the list and is marked
 * `data-limited` rather than removed, so it fades instead of vanishing.
 */
function Toaster({ className, ...props }: ToastPrimitive.Viewport.Props) {
  const { toasts } = useToast();

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toaster"
        className={cn(
          "fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none",
          className,
        )}
        {...props}
      >
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            toast={toast}
            data-slot="toast"
            className="flex items-start gap-3 rounded-2xl bg-popover bg-clip-padding px-4 py-3 text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/5 transition duration-200 ease-out data-ending-style:translate-y-2 data-ending-style:opacity-0 data-limited:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0 dark:ring-foreground/10"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <ToastPrimitive.Title className="font-medium" />
              <ToastPrimitive.Description className="text-muted-foreground" />
              <ToastPrimitive.Action render={<Button variant="outline" size="sm" />} />
            </div>
            <ToastPrimitive.Close
              render={<Button variant="ghost" size="icon-xs" className="-mr-1.5" />}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              <span className="sr-only">Close</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

export { Toaster, ToastProvider, useToast };
