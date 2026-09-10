import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/lib/task-store";
import { formatDate, getCompleted, groupByMonth } from "@/lib/metrics";

export const Route = createFileRoute("/accomplishments")({
  head: () => ({
    meta: [
      { title: "Accomplishments & Reports | IT Work Monitoring & Tracking" },
      {
        name: "description",
        content:
          "Monthly log of completed IT activities, filterable by date range, ready to present as an executive accomplishment report.",
      },
      { property: "og:title", content: "Accomplishments & Reports | IT Work Monitoring" },
      {
        property: "og:description",
        content: "Completed IT activities grouped by month for leadership reporting.",
      },
    ],
  }),
  component: Accomplishments;
});

function Accomplishments() {
  const { tasks } = useTasks();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const completed = useMemo(() => {
    return getCompleted(tasks).filter((task) => {
      if (from && task.lastUpdated < from) return false;
      if (to && task.lastUpdated > to) return false;
      return true;
    });
  }, [tasks, from, to]);

  const groups = groupByMonth(completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Accomplishments &amp; Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {completed.length} completed activities available for executive reporting.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-44"
            />
          </div>
          <Button
            variant="outline"
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
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No completed activities in this date range.
          </CardContent>
        </Card>
      )}

      {groups.map((group) => (
        <Card key={group.month}>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{group.month}</CardTitle>
            <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
              {group.items.length} completed
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.items.map((task) => (
              <div key={task.id} className="flex gap-3 rounded-lg border border-border p-4">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-semibold leading-snug">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.category} • {task.assignee} • completed {formatDate(task.lastUpdated)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{task.remarks}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
