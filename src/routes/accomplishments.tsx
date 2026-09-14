import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/lib/task-store";
import { formatDate, getCompleted, groupByMonth } from "@/lib/metrics";
import { completionDate } from "@/lib/task-rules";

export const Route = createFileRoute("/accomplishments")({
  head: () => ({
    meta: [
      { title: "Accomplishments & Reports | IT Work Monitoring & Tracking" },
      {
        name: "description",
        content: "Monthly log of completed IT work, ready for executive reporting.",
      },
      { property: "og:title", content: "Accomplishments & Reports | IT Work Monitoring" },
      {
        property: "og:description",
        content: "Completed activities grouped by month.",
      },
    ],
  }),
  component: Accomplishments,
});

function Accomplishments() {
  const { tasks } = useTasks();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const completed = useMemo(() => {
    return getCompleted(tasks).filter((task) => {
      const done = completionDate(task);
      if (from && done < from) return false;
      if (to && done > to) return false;
      return true;
    });
  }, [tasks, from, to]);

  const groups = groupByMonth(completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Accomplishments &amp; Reports
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:hidden">
          {completed.length} completed activities.
        </p>
        <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
          {completed.length} completed activities available for executive reporting.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-5">
          <div className="w-full min-w-0 space-y-1.5 sm:w-auto">
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="min-w-0 w-full sm:w-44"
            />
          </div>
          <div className="w-full min-w-0 space-y-1.5 sm:w-auto">
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="min-w-0 w-full sm:w-44"
            />
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear range
          </Button>
        </CardContent>
      </Card>

      {groups.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground sm:p-10">
            No completed activities in this date range.
          </CardContent>
        </Card>
      )}

      {groups.map((group) => (
        <Card key={group.month}>
          <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm sm:text-base">{group.month}</CardTitle>
            <span className="w-fit rounded bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
              {group.items.length} completed
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.items.map((task) => (
              <div key={task.id} className="flex gap-3 rounded-lg border border-border p-3 sm:p-4">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug break-words">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground break-words">
                    {task.category} • {task.assignee} • completed{" "}
                    {formatDate(completionDate(task))}
                  </p>
                  {task.remarks ? (
                    <p className="mt-2 text-xs leading-relaxed break-words sm:text-sm">{task.remarks}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
