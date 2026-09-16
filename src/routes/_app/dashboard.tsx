import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, ListChecks, PauseCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/skeletons";
import { PriorityBadge, ProgressBar, CircularProgress, StatusBadge } from "@/components/status-badges";
import { WorkId } from "@/components/activity-refs";
import type { Task } from "@/data/tasks";
import { useTasks } from "@/lib/task-store";
import {
  formatDate,
  getBlockers,
  getCategoryStats,
  getMetrics,
  getOverdue,
  getPriorityActivities,
} from "@/lib/metrics";
import { calendarDaysBetween, isOverdue, todayISO } from "@/lib/task-rules";
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
    <div className="flex flex-col gap-6">
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
      <div className="flex flex-col gap-6">
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
        <RankedListCard
          title="Overdue projects"
          chip={`Past target (${overdue.length})`}
        >
          <div className="space-y-0 md:hidden">
            {overdue.map((task, index) => {
              const late = daysPastTarget(task);
              return (
                <div
                  key={task.id}
                  className="flex gap-3 border-b border-border/70 px-4 py-3 last:border-0"
                >
                  <RankBadge rank={index + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{task.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <WorkId work={task} />
                      {task.assignee}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge status={task.status} />
                      <MetricValue
                        value={late}
                        hint={late === 1 ? "day late" : "days late"}
                        tone="danger"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="w-16 whitespace-nowrap px-5 py-2.5">Rank</th>
                  <th className="px-3 py-2.5">Activity</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="w-36 px-3 py-2.5">Progress</th>
                  <th className="px-3 py-2.5">Days late</th>
                  <th className="px-5 py-2.5">Target</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((task, index) => {
                  const late = daysPastTarget(task);
                  return (
                    <tr key={task.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3.5">
                        <RankBadge rank={index + 1} />
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium leading-snug">{task.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <WorkId work={task} />
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">{task.assignee}</td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-3 py-3.5">
                        <MetricValue value={`${task.progress}%`} hint="complete" />
                      </td>
                      <td className="px-3 py-3.5">
                        <MetricValue
                          value={late}
                          hint={late === 1 ? "day" : "days"}
                          tone="danger"
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                        {formatDate(task.targetDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </RankedListCard>
      )}

      <RankedListCard
        title="Blockers & On-Hold Items"
        chip={blockers.length === 0 ? "None stalled" : `On hold (${blockers.length})`}
      >
        {blockers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No stalled activities.
          </p>
        ) : (
          <>
            <div className="space-y-0 md:hidden">
              {blockers.map((task, index) => (
                <div
                  key={task.id}
                  className="flex gap-3 border-b border-border/70 px-4 py-3 last:border-0"
                >
                  <RankBadge rank={index + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{task.title}</p>
                    {task.remarks ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {task.remarks}
                      </p>
                    ) : null}
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <WorkId work={task} />
                      {task.assignee}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <PriorityBadge priority={task.priority} />
                      <MetricValue value={`${task.progress}%`} hint="complete" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="w-16 whitespace-nowrap px-5 py-2.5">Rank</th>
                    <th className="px-3 py-2.5">Activity</th>
                    <th className="px-3 py-2.5">Owner</th>
                    <th className="px-3 py-2.5">Priority</th>
                    <th className="min-w-48 px-3 py-2.5">Situation</th>
                    <th className="px-5 py-2.5">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {blockers.map((task, index) => (
                    <tr key={task.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3.5">
                        <RankBadge rank={index + 1} />
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium leading-snug">{task.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <WorkId work={task} />
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">{task.assignee}</td>
                      <td className="px-3 py-3.5">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-3 py-3.5 text-xs leading-relaxed text-muted-foreground">
                        <p className="line-clamp-2">{task.remarks || "—"}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                        {formatDate(task.targetDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </RankedListCard>
      </div>
      )}
    </div>
  );
}

function daysPastTarget(task: Task, today = todayISO()) {
  return Math.max(0, calendarDaysBetween(task.targetDate, today));
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-8 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        rank === 1 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
      )}
    >
      {String(rank).padStart(2, "0")}
    </span>
  );
}

function MetricValue({
  value,
  hint,
  tone = "default",
}: {
  value: ReactNode;
  hint: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="leading-tight">
      <p
        className={cn(
          "font-medium tabular-nums",
          tone === "danger" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className={cn("text-xs", tone === "danger" ? "text-destructive/80" : "text-muted-foreground")}>
        {hint}
      </p>
    </div>
  );
}

function RankedListCard({
  title,
  chip,
  children,
}: {
  title: string;
  chip: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="pt-1">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
            {chip}
          </span>
        </p>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
