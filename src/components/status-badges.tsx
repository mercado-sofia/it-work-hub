import type { Priority, Status } from "@/data/tasks";
import { cn } from "@/lib/utils";

const statusStyles: Record<Status, string> = {
  "Not Started": "bg-muted text-muted-foreground border-border",
  "In Progress": "bg-info-soft text-info border-info/25",
  "For Testing": "bg-warning-soft text-warning border-warning/25",
  Completed: "bg-success-soft text-success border-success/25",
  "On Hold": "bg-destructive/10 text-destructive border-destructive/25",
};

const statusTextStyles: Record<Status, string> = {
  "Not Started": "text-muted-foreground",
  "In Progress": "text-muted-foreground",
  "For Testing": "text-muted-foreground",
  Completed: "text-primary",
  "On Hold": "text-muted-foreground",
};

const priorityStyles: Record<Priority, string> = {
  Critical: "bg-destructive text-destructive-foreground border-destructive",
  High: "bg-warning-soft text-warning border-warning/30",
  Medium: "bg-info-soft text-info border-info/30",
  Low: "bg-muted text-muted-foreground border-border",
};

const priorityTextStyles: Record<Priority, string> = {
  Critical: "text-destructive",
  High: "text-warning",
  Medium: "text-info",
  Low: "text-muted-foreground",
};

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function StatusBadge({
  status,
  className,
  variant = "badge",
}: {
  status: Status;
  className?: string;
  variant?: "badge" | "plain";
}) {
  if (variant === "plain") {
    return (
      <span className={cn("whitespace-nowrap text-xs font-normal", statusTextStyles[status], className)}>
        {status}
      </span>
    );
  }
  return <span className={cn(base, statusStyles[status], className)}>{status}</span>;
}

export function PriorityBadge({
  priority,
  className,
  variant = "badge",
}: {
  priority: Priority;
  className?: string;
  variant?: "badge" | "plain";
}) {
  if (variant === "plain") {
    return (
      <span className={cn("whitespace-nowrap text-xs font-medium", priorityTextStyles[priority], className)}>
        {priority}
      </span>
    );
  }
  return <span className={cn(base, priorityStyles[priority], className)}>{priority}</span>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function CircularProgress({
  value,
  size = 160,
  strokeWidth = 12,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums leading-none">{clamped}%</p>
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">Completed</p>
        </div>
      </div>
    </div>
  );
}
