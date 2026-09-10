import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock, ListChecks, PauseCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, ProgressBar, StatusBadge } from "@/components/status-badges";
import { useTasks } from "@/lib/task-store";
import {
  formatDate,
  getBlockers,
  getCategoryStats,
  getMetrics,
  getPriorityActivities,
} from "@/lib/metrics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard | IT Work Monitoring & Tracking" },
      {
        name: "description",
        content:
          "Executive view of IT department activities: KPIs, overall progress, work by category, priority projects, and current blockers.",
      },
      { property: "og:title", content: "Executive Dashboard | IT Work Monitoring & Tracking" },
      {
        property: "og:description",
        content: "KPIs, department progress, priority projects, and blockers at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { tasks } = useTasks();
  const metrics = getMetrics(tasks);
  const categories = getCategoryStats(tasks);
  const priorities = getPriorityActivities(tasks);
  const blockers = getBlockers(tasks);

  const kpis = [
    { label: "Total Activities", value: metrics.total, icon: ListChecks, tone: "text-primary" },
    { label: "Completed", value: metrics.completed, icon: CheckCircle2, tone: "text-success" },
    { label: "In Progress", value: metrics.inProgress, icon: Clock, tone: "text-info" },
    { label: "Pending / On Hold", value: metrics.pending, icon: PauseCircle, tone: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Executive Management Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidated status of all IT department work as of {formatDate(new Date().toISOString().slice(0, 10))}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
              </div>
              <Icon className={`size-8 ${tone}`} strokeWidth={1.6} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold">Overall Department Progress</p>
              <p className="text-xs text-muted-foreground">
                Aggregate completion across all {metrics.total} tracked activities
              </p>
            </div>
            <p className="font-display text-2xl font-semibold tabular-nums">{metrics.overall}%</p>
          </div>
          <ProgressBar value={metrics.overall} className="mt-4 h-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Work by Category</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((stat) => (
            <div key={stat.category} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug">{stat.category}</p>
                <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {stat.count}
                </span>
              </div>
              <ProgressBar value={stat.completion} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                {stat.completion}% avg. completion • {stat.completed} of {stat.count} closed
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Current Priority Activities</CardTitle>
          <Link to="/tracker" className="text-xs font-medium text-primary hover:underline">
            View full tracker
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Activity</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="w-40 px-3 py-2.5 font-medium">Progress</th>
                  <th className="px-5 py-2.5 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {priorities.map((task) => (
                  <tr key={task.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium leading-snug">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.category}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{task.assignee}</td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-3 py-3">
                      <ProgressBar value={task.progress} />
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {task.progress}%
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {formatDate(task.targetDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="flex-row items-center gap-2 pb-2">
          <AlertTriangle className="size-4 text-destructive" />
          <CardTitle className="text-base text-destructive">
            Blockers &amp; On-Hold Items ({blockers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {blockers.length === 0 && (
            <p className="text-sm text-muted-foreground">No stalled activities. </p>
          )}
          {blockers.map((task) => (
            <div key={task.id} className="rounded-lg border border-destructive/25 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{task.title}</p>
                <PriorityBadge priority={task.priority} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {task.category} • {task.assignee} • {task.progress}% complete • target{" "}
                {formatDate(task.targetDate)}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{task.remarks}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
