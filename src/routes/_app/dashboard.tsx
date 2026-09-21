import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardList, Clock, ListChecks, PauseCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/skeletons";
import { ExportMenu } from "@/components/DataActions";
import { PageHeading } from "@/components/PageHeading";
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
import { MobileItemCard } from "@/components/MobileItemCard";

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
    <div className="flex flex-col gap-6 max-lg:gap-5">
      <PageHeading
        greeting
        lead="Here’s your"
        title="overview."
        desktopTitle="Executive Management Dashboard"
        subtitle={`IT work status as of ${formatDate(new Date().toISOString().slice(0, 10))}.`}
        hideSubtitleOnMobile
        actions={<ExportMenu className="shrink-0 lg:hidden print:hidden" />}
      />

      {!hydrated ? (
        <DashboardSkeleton />
      ) : (
      <div className="flex flex-col gap-6 max-lg:gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className="border-border max-lg:rounded-3xl max-lg:shadow-sm"
          >
            <CardContent className="p-5 max-lg:p-4">
              <div className="lg:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="size-5 text-primary" strokeWidth={1.75} />
                  </span>
                  <p className="font-display text-2xl font-bold tabular-nums leading-none">{value}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{label}</p>
              </div>
              <div className="hidden items-center justify-between gap-4 lg:flex">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                    {label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
                </div>
                <Icon className="size-8 text-primary" strokeWidth={1.6} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <Card className="flex h-full min-w-0 flex-col border-border max-lg:rounded-[1.75rem] max-lg:bg-primary/10 max-lg:shadow-none">
          <CardHeader className="shrink-0 max-lg:flex-row max-lg:items-center max-lg:justify-between max-lg:gap-3 max-lg:px-5 max-lg:py-5 lg:pb-2">
            <div className="min-w-0">
              <CardTitle className="text-base max-lg:text-lg max-lg:font-semibold">Overall Progress</CardTitle>
              <p className="text-xs text-muted-foreground max-lg:mt-1 max-lg:leading-relaxed">
                Aggregate completion across {metrics.total} activities
              </p>
              <Link
                to="/tracker"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground lg:hidden"
              >
                View tracker
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <CircularProgress
              value={metrics.overall}
              size={120}
              strokeWidth={10}
              className="shrink-0 lg:hidden"
            />
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center p-5 max-lg:hidden">
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

        <Card className="min-w-0 border-border max-lg:rounded-[1.75rem] max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none">
          <CardHeader className="pb-2 max-lg:px-0 max-lg:pt-1">
            <CardTitle className="text-base">Work by Category</CardTitle>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-3 sm:grid-cols-2 max-lg:px-0">
            {categoryStats.map((stat) => (
              <div
                key={stat.category}
                className="min-w-0 overflow-hidden rounded-lg border border-border p-3 max-lg:rounded-3xl max-lg:bg-card max-lg:p-4 max-lg:shadow-sm"
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

      <Card className="border-border max-lg:rounded-[1.75rem] max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none">
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between max-lg:px-0 max-lg:pt-1">
          <CardTitle className="text-base">Current Priority Projects</CardTitle>
          <Link
            to="/tracker"
            className="hidden shrink-0 text-xs font-medium text-primary hover:underline lg:inline"
          >
            View full tracker
          </Link>
        </CardHeader>
        <CardContent className="p-0 max-lg:px-0">
          <div className="space-y-3 p-4 lg:hidden max-lg:px-0 max-lg:pt-1">
            {priorities.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No priority projects yet.
              </p>
            )}
            {priorities.map((task) => (
              <MobileItemCard
                key={task.id}
                icon={ClipboardList}
                title={task.title}
                subtitle={`${task.category} · ${task.assignee}`}
                idLabel={<WorkId work={task} />}
                badge={<StatusBadge status={task.status} />}
                date={formatDate(task.targetDate)}
                dateClassName={isOverdue(task) ? "font-medium text-destructive" : undefined}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
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
          <div className="space-y-3 p-4 lg:hidden max-lg:px-0 max-lg:pt-1">
            {overdue.map((task) => (
              <MobileItemCard
                key={task.id}
                icon={ClipboardList}
                title={task.title}
                subtitle={task.assignee}
                idLabel={<WorkId work={task} />}
                badge={<StatusBadge status={task.status} />}
                date={formatDate(task.targetDate)}
                dateClassName="font-medium text-destructive"
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
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
            <div className="space-y-3 p-4 lg:hidden max-lg:px-0 max-lg:pt-1">
              {blockers.map((task) => (
                <MobileItemCard
                  key={task.id}
                  icon={ClipboardList}
                  title={task.title}
                  subtitle={task.assignee}
                  idLabel={<WorkId work={task} />}
                  badge={<StatusBadge status={task.status} />}
                  date={formatDate(task.targetDate)}
                  dateClassName={isOverdue(task) ? "font-medium text-destructive" : undefined}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
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
    <Card className="min-w-0 border-border max-lg:rounded-[1.75rem] max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 max-lg:gap-3 max-lg:px-0 max-lg:pt-1">
        <CardTitle className="min-w-0 text-base">{title}</CardTitle>
        <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          {chip}
        </span>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
