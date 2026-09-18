import { ArrowRight } from "lucide-react";
import { RequestStatusBadge } from "@/components/request-badges";
import type { RequestStatus, RequestStatusHistory } from "@/data/requests";
import { cn } from "@/lib/utils";

type HistoryItem = Pick<
  RequestStatusHistory,
  "id" | "fromStatus" | "toStatus" | "actorName" | "reason" | "createdAt"
>;

const dotStyles: Record<RequestStatus, string> = {
  Submitted: "bg-muted-foreground/45",
  "Under Review": "bg-info",
  Accepted: "bg-info",
  "In Progress": "bg-info",
  Testing: "bg-warning",
  Resolved: "bg-success",
  Closed: "bg-muted-foreground/45",
  Declined: "bg-destructive",
  Cancelled: "bg-destructive",
};

function formatHistoryWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RequestStatusHistoryList({
  history,
  showActor = false,
}: {
  history: HistoryItem[];
  showActor?: boolean;
}) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No status changes yet.</p>;
  }

  return (
    <ol>
      {history.map((row, index) => {
        const isCurrent = index === history.length - 1;
        return (
          <li key={row.id} className="flex gap-3">
            <div className="flex w-4 shrink-0 flex-col items-center" aria-hidden>
              <span
                className={cn(
                  "mt-1.5 size-2.5 shrink-0 rounded-full",
                  dotStyles[row.toStatus],
                  isCurrent && "ring-[3px] ring-primary/20",
                )}
              />
              {isCurrent ? null : <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className={cn("min-w-0 flex-1", isCurrent ? "pb-0.5" : "pb-5")}>
              <div className="flex flex-wrap items-center gap-2">
                {row.fromStatus ? (
                  <>
                    <span className="text-xs text-muted-foreground">{row.fromStatus}</span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground/60" aria-hidden />
                    <span className="sr-only">to</span>
                  </>
                ) : null}
                <RequestStatusBadge status={row.toStatus} />
                {isCurrent ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Current
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                <time dateTime={row.createdAt}>{formatHistoryWhen(row.createdAt)}</time>
                {showActor && row.actorName ? (
                  <>
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    {row.actorName}
                  </>
                ) : null}
              </p>
              {row.reason ? (
                <p className="mt-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                  {row.reason}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
