import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { activityDisplayId } from "@/lib/task-rules";

type WorkRef = { id: string; requestRef?: string | null };

export function ActivityId({ id, className }: { id: string; className?: string | undefined }) {
  return (
    <span className={cn("whitespace-nowrap font-medium tabular-nums text-muted-foreground", className)}>
      {id}
    </span>
  );
}

/** Tracker ID: `R-…` for converted requests (links to the ticket), otherwise `T-…`. */
export function WorkId({ work, className }: { work: WorkRef; className?: string | undefined }) {
  const id = activityDisplayId(work);
  const ticket = work.requestRef?.trim();
  if (ticket) {
    return (
      <Link
        to="/requests/$ticket"
        params={{ ticket }}
        className={cn("whitespace-nowrap font-medium tabular-nums text-primary hover:underline", className)}
      >
        {id}
      </Link>
    );
  }
  return <ActivityId id={id} className={className} />;
}

export function ActivityIdLink({ id, className }: { id: string; className?: string | undefined }) {
  return (
    <Link
      to="/tracker"
      search={{ q: id }}
      className={cn("whitespace-nowrap font-medium tabular-nums text-primary hover:underline", className)}
    >
      {id}
    </Link>
  );
}
