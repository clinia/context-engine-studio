"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CheckCircleIcon } from "@/components/ui/icons/check-circle";
import { InfoIcon } from "@/components/ui/icons/info";
import { WarningIcon } from "@/components/ui/icons/warning";
import { CancelIcon } from "@/components/ui/icons/cancel";
import { ProgressActivityIcon } from "@/components/ui/icons/progress-activity";

function Toaster({ ...props }: ToasterProps) {
  // Follows the next-themes ThemeProvider. Without one, toasts use the light theme:
  // pass `theme` when the page sets `.dark` itself.
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <CancelIcon className="size-4" />,
        loading: <ProgressActivityIcon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          // Sonner's unlayered stylesheet sets its own description grey, so the token needs `!` to win.
          description: "text-muted-foreground!",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
