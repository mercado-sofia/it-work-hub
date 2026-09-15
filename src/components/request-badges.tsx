import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/data/requests";

const styles: Record<RequestStatus, string> = {
  Submitted: "bg-muted text-muted-foreground border-border",
  "Under Review": "bg-info-soft text-info border-info/25",
  Accepted: "bg-info-soft text-info border-info/25",
  "In Progress": "bg-info-soft text-info border-info/25",
  Testing: "bg-warning-soft text-warning border-warning/25",
  Resolved: "bg-success-soft text-success border-success/25",
  Closed: "bg-muted text-muted-foreground border-border",
  Declined: "bg-destructive/10 text-destructive border-destructive/25",
};

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function RequestStatusBadge({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  return <span className={cn(base, styles[status], className)}>{status}</span>;
}
