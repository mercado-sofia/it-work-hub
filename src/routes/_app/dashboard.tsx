import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListChecks,
  PauseCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/skeletons";
import { PriorityBadge, ProgressBar, CircularProgress, StatusBadge } from "@/components/status-badges";
import { WorkId } from "@/components/activity-refs";
import { useTasks } from "@/lib/task-store";
import {
  formatDate,
  getBlockers,
  getCategoryStats,
  getMetrics,
  getOverdue,
  getPriorityActivities,
} from "@/lib/metrics";
import { isOverdue } from "@/lib/task-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard | IT Work Monitoring & Tracking" },
      {
        name: "description",
        content:
          "Executive view of IT work: KPIs, planned activities, progress by category, and blockers.",
      },
      { property: "og:title", content: "Executive Dashboard | IT Work Monitoring & Tracking" },
      {
        property: "og:description",
        content: "IT work progress at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { tasks, categories, hydrated } = useTasks();
  const metrics = getMetrics(tasks);
  const categoryStats = getCategoryStats(tasks, categories);
  const priorities = getPriorityActivities(tasks);
  const blockers = getBlockers(tasks);
  const overdue = getOverdue(tasks);

  const kpis = [
    { label: "Activities", value: metrics.total, icon: ListChecks },
    { label: "Completed", value: metrics.completed, icon: CheckCircle2 },
    { label: "In Progress", value: metrics.inProgress, icon: Clock },
    { label: "On Hold", value: metrics.onHold, icon: PauseCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Executive Management Dashboard
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:hidden">
          Status as of {formatDate(new Date().toISOString().slice(0, 10))}.
        </p>
        <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
          IT work status as of {formatDate(new Date().toISOString().slice(0, 10))}.
        </p>
      </div>

      {!hydrated ? (
        <DashboardSkeleton />
      ) : (
      <div className="contents">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                  {label}
                </p>
                <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
              </div>
              <Icon className="size-8 text-primary" strokeWidth={1.6} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <Card className="flex h-full min-w-0 flex-col border-border">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle className="text-base">Overall Progress</CardTitle>
            <p className="text-xs text-muted-foreground">
              Aggregate completion across {metrics.total} activities
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center p-5">
            <CircularProgress
              value={metrics.overall}
              size={160}
              strokeWidth={12}
              className="sm:hidden"
            />
            <CircularProgress
              value={metrics.overall}
              size={220}
              strokeWidth={16}
              className="hidden sm:inline-grid"
            />
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Work by Category</CardTitle>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-3 sm:grid-cols-2">
            {categoryStats.map((stat) => (
              <div
                key={stat.category}
                className="min-w-0 overflow-hidden rounded-lg border border-border p-3"
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-foreground">
                    {stat.category}
                  </p>
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums text-secondary-foreground">
                    {stat.count}
                  </span>
                </div>
                <ProgressBar value={stat.completion} className="mt-3" />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {stat.completion}% avg. • {stat.completed}/{stat.count} closed
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Current Priority Projects</CardTitle>
          <Link to="/tracker" className="shrink-0 text-xs font-medium text-primary hover:underline">
            View full tracker
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {priorities.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No priority projects yet.
              </p>
            )}
            {priorities.map((task) => (
              <div key={task.id} className="rounded-lg border border-border p-3">
                <p className="font-medium leading-snug">{task.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <WorkId work={task} />
                  {task.category} • {task.assignee}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
                <ProgressBar value={task.progress} className="mt-3" />
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">{task.progress}%</p>
                <p
                  className={cn(
                    "mt-2 text-xs",
                    isOverdue(task) ? "font-medium text-destructive" : "text-muted-foreground",
                  )}
                >
                  Target {formatDate(task.targetDate)}
                  {isOverdue(task) ? " · overdue" : ""}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="whitespace-nowrap px-5 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Activity</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="w-40 px-3 py-2.5 font-medium">Progress</th>
                  <th className="px-5 py-2.5 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {priorities.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">
                      No priority projects yet.
                    </td>
                  </tr>
                )}
                {priorities.map((task) => (
                  <tr key={task.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-5 py-3">
                      <WorkId work={task} />
                    </td>
                    <td className="px-3 py-3">
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
                    <td
                      className={cn(
                        "whitespace-nowrap px-5 py-3",
                        isOverdue(task) ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {formatDate(task.targetDate)}
                      {isOverdue(task) ? " · overdue" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {overdue.length > 0 && (
        <Card className="border-warning/40 bg-warning-soft/60">
          <CardHeader className="flex-row items-center gap-2 pb-2">
            <AlertTriangle className="size-4 text-warning" />
            <CardTitle className="text-base">Overdue projects ({overdue.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.map((task) => (
              <div key={task.id} className="rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <WorkId work={task} />
                  {task.assignee} • {task.status} • target {formatDate(task.targetDate)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="flex-row items-center gap-2 pb-2">
          <AlertTriangle className="size-4 text-destructive" />
          <CardTitle className="text-base text-destructive">
            Blockers &amp; On-Hold Items ({blockers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {blockers.length === 0 && (
            <p className="text-sm text-muted-foreground">No stalled activities.</p>
          )}
          {blockers.map((task) => (
            <div key={task.id} className="rounded-lg border border-destructive/25 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{task.title}</p>
                <PriorityBadge priority={task.priority} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <WorkId work={task} />
                {task.category} • {task.assignee} • {task.progress}% complete • target{" "}
                {formatDate(task.targetDate)}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{task.remarks}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
      )}
    </div>
  );
}
