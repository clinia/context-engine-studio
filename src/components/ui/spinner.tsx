import { cn } from "@/lib/utils";
import { ProgressActivityIcon } from "@/components/ui/icons/progress-activity";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <ProgressActivityIcon
      data-slot="spinner"
      role="status"
      label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
