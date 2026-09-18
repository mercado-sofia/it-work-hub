import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { AccomplishmentsSkeleton } from "@/components/skeletons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PriorityBadge } from "@/components/status-badges";
import { ActivityIdLink, WorkId } from "@/components/activity-refs";
import { useTasks } from "@/lib/task-store";
import {
  detectPeriodPreset,
  filterCompleted,
  formatPeriodLabel,
  formatReportDate,
  getCompleted,
  getPeriodSnapshot,
  groupByMonth,
  isValidDateRange,
  lastMonthRange,
  parseISODateParam,
  thisMonthRange,
  thisQuarterRange,
  ytdRange,
  type PeriodPreset,
} from "@/lib/metrics";
import { completionDate } from "@/lib/task-rules";
import type { Task } from "@/data/tasks";

type AccomplishmentsSearch = {
  from?: string | undefined;
  to?: string | undefined;
  all?: boolean | undefined;
};

const PRESETS: { id: Exclude<PeriodPreset, "custom">; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "last", label: "Last month" },
  { id: "quarter", label: "This quarter" },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "All time" },
];

function parseAllParam(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

export const Route = createFileRoute("/_app/accomplishments")({
  validateSearch: (search: Record<string, unknown>): AccomplishmentsSearch => {
    if (parseAllParam(search["all"])) return { all: true };
    const from = parseISODateParam(search["from"]);
    const to = parseISODateParam(search["to"]);
    const next: AccomplishmentsSearch = {};
    if (from) next.from = from;
    if (to) next.to = to;
    return next;
  },
  head: () => ({
    meta: [
      { title: "Accomplishments & Reports | IT Work Monitoring & Tracking" },
      {
        name: "description",
        content: "Period briefing of completed tracker activities, ready for executive reporting.",
      },
      { property: "og:title", content: "Accomplishments & Reports | IT Work Monitoring" },
      {
        property: "og:description",
        content: "Completed tracker activities grouped by month for a selected reporting window.",
      },
    ],
  }),
  component: Accomplishments,
});

function Accomplishments() {
  const { tasks, hydrated } = useTasks();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [ownerFilters, setOwnerFilters] = useState<string[]>([]);
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const month = thisMonthRange();
  const allTime = search.all === true;
  const from = allTime ? "" : (search.from ?? month.from);
  const to = allTime ? "" : (search.to ?? month.to);
  const rangeValid = allTime || isValidDateRange(from, to);
  const preset = detectPeriodPreset(from || undefined, to || undefined, allTime);
  const periodText = formatPeriodLabel({
    from: allTime ? undefined : from || undefined,
    to: allTime ? undefined : to || undefined,
    all: allTime,
  });

  const setWindow = (next: AccomplishmentsSearch) => {
    void navigate({ to: "/accomplishments", search: next, replace: true });
  };

  const applyPreset = (id: Exclude<PeriodPreset, "custom">) => {
    if (id === "all") {
      setWindow({ all: true });
      return;
    }
    const range =
      id === "month"
        ? thisMonthRange()
        : id === "last"
          ? lastMonthRange()
          : id === "quarter"
            ? thisQuarterRange()
            : ytdRange();
    setWindow({ from: range.from, to: range.to });
  };

  const onFromChange = (value: string) => {
    setWindow({ from: value || undefined, to: to || undefined });
  };

  const onToChange = (value: string) => {
    setWindow({ from: from || undefined, to: value || undefined });
  };

  const completedAll = useMemo(() => getCompleted(tasks), [tasks]);

  const inWindow = useMemo(() => {
    if (!rangeValid) return [];
    return filterCompleted(tasks, {
      from: allTime ? undefined : from || undefined,
      to: allTime ? undefined : to || undefined,
    });
  }, [tasks, rangeValid, allTime, from, to]);

  const visible = useMemo(() => {
    if (!rangeValid) return [];
    return filterCompleted(tasks, {
      from: allTime ? undefined : from || undefined,
      to: allTime ? undefined : to || undefined,
      categories: categoryFilters,
      assignees: ownerFilters,
      query,
    });
  }, [tasks, rangeValid, allTime, from, to, categoryFilters, ownerFilters, query]);

  const groups = useMemo(() => groupByMonth(visible), [visible]);
  const snapshot = useMemo(() => getPeriodSnapshot(visible), [visible]);
  const extraFilters = categoryFilters.length > 0 || ownerFilters.length > 0 || query.trim().length > 0;

  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    for (const task of inWindow) names.add(task.category);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [inWindow]);

  const ownerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const task of inWindow) {
      if (task.assignee.trim()) names.add(task.assignee);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [inWindow]);

  const resetFilters = () => {
    setQuery("");
    setCategoryFilters([]);
    setOwnerFilters([]);
  };

  const runExport = async (kind: "xlsx" | "pdf") => {
    if (!rangeValid || visible.length === 0) return;
    setBusy(kind);
    try {
      const period = {
        from: allTime ? undefined : from || undefined,
        to: allTime ? undefined : to || undefined,
        all: allTime,
      };
      if (kind === "xlsx") {
        const { exportAccomplishmentsWorkbook } = await import("@/lib/export-excel");
        await exportAccomplishmentsWorkbook(visible, period);
        toast.success("Accomplishments workbook downloaded");
      } else {
        const { exportAccomplishmentsPdf } = await import("@/lib/export-pdf");
        const { getSettingsFn } = await import("@/lib/request-functions");
        const settings = await getSettingsFn();
        await exportAccomplishmentsPdf(visible, { ...period, departmentName: settings.departmentName });
        toast.success("Accomplishments PDF downloaded");
      }
    } catch (error) {
      console.error(error);
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const canExport = hydrated && rangeValid && visible.length > 0 && busy === null;

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Accomplishments &amp; Reports
          </h1>
          <p className="mt-1 break-words text-xs text-muted-foreground" aria-live="polite">
            {hydrated ? `Completed tracker activities for ${periodText}.` : "\u00a0"}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!canExport}
            onClick={() => void runExport("xlsx")}
          >
            {busy === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            <span className="sm:hidden">Excel</span>
            <span className="hidden sm:inline">Download Excel</span>
          </Button>
          <Button size="sm" className="gap-2" disabled={!canExport} onClick={() => void runExport("pdf")}>
            {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            <span className="sm:hidden">PDF</span>
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
        </div>
      </div>

      <Card className="min-w-0 border-border print:hidden">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reporting window
            </legend>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={preset === item.id ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => applyPreset(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
              <div className="w-full min-w-0 space-y-1.5 sm:w-auto">
                <Label htmlFor="from" className="text-xs">
                  From
                </Label>
                <Input
                  id="from"
                  type="date"
                  value={allTime ? "" : from}
                  max={allTime ? undefined : to || undefined}
                  disabled={allTime}
                  aria-invalid={!allTime && !rangeValid}
                  onChange={(e) => onFromChange(e.target.value)}
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
                  value={allTime ? "" : to}
                  min={allTime ? undefined : from || undefined}
                  disabled={allTime}
                  aria-invalid={!allTime && !rangeValid}
                  onChange={(e) => onToChange(e.target.value)}
                  className="min-w-0 w-full sm:w-44"
                />
              </div>
            </div>
            {!allTime && !rangeValid ? (
              <p className="text-xs text-destructive" role="alert">
                From must be on or before To.
              </p>
            ) : null}
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full min-w-0 flex-1 md:min-w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, results, IDs…"
                className={query ? "pl-9 pr-9" : "pl-9"}
                disabled={!hydrated}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <MultiFilter
              label="Category"
              options={categoryOptions}
              selected={categoryFilters}
              onChange={setCategoryFilters}
            />
            <MultiFilter
              label="Owner"
              options={ownerOptions}
              selected={ownerFilters}
              onChange={setOwnerFilters}
            />
          </div>
        </CardContent>
      </Card>

      {!hydrated ? (
        <AccomplishmentsSkeleton />
      ) : !rangeValid ? null : completedAll.length === 0 ? (
        <Card className="border-border">
          <CardContent className="space-y-3 p-6 text-center sm:p-10">
            <p className="text-sm text-muted-foreground">No completed tracker activities yet.</p>
            <Link to="/tracker" className="inline-block text-xs font-medium text-primary hover:underline">
              Open tracker
            </Link>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="border-border">
          <CardContent className="space-y-3 p-6 text-center sm:p-10">
            <p className="text-sm text-muted-foreground">
              {extraFilters
                ? "No completions match these filters."
                : "No completions in this window."}
            </p>
            {extraFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => applyPreset("all")}>
                View all time
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SnapshotCard label="Completions" value={snapshot.count} icon={CheckCircle2} />
            <SnapshotCard label="Categories" value={snapshot.categoryCount} icon={Layers} />
            <SnapshotCard label="Owners" value={snapshot.ownerCount} icon={Users} />
          </div>

          {snapshot.byCategory.length > 0 ? (
            <Card className="border-border">
              <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4 sm:p-5">
                <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  By category
                </p>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {snapshot.byCategory.map((row) => (
                    <span
                      key={row.name}
                      className="max-w-full break-words rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                    >
                      {row.name}
                      <span className="ml-1.5 font-semibold tabular-nums">{row.count}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {groups.map((group, index) => (
            <MonthGroup key={group.month} month={group.month} items={group.items} initiallyOpen={index === 0} />
          ))}
        </>
      )}
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
}) {
  return (
    <Card className="border-border">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="size-8 text-primary" strokeWidth={1.6} />
      </CardContent>
    </Card>
  );
}

function MonthGroup({
  month,
  items,
  initiallyOpen,
}: {
  month: string;
  items: Task[];
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Card className="min-w-0 border-border">
      <details
        className="accomplishment-month group"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
          <h2 className="min-w-0 break-words font-display text-sm font-semibold tracking-tight sm:text-base">{month}</h2>
          <span className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">
              {items.length} completed
            </span>
            <ChevronDown className="month-chevron size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="min-w-0 space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
          {items.map((task) => (
            <AccomplishmentRow key={task.id} task={task} />
          ))}
        </div>
      </details>
    </Card>
  );
}

function AccomplishmentRow({ task }: { task: Task }) {
  const ticket = task.requestRef?.trim();
  const result = task.remarks.trim();
  return (
    <div className="min-w-0 rounded-lg border border-border p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold leading-snug">{task.title}</p>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {ticket ? <WorkId work={task} /> : <ActivityIdLink id={task.id} />}
            <PriorityBadge priority={task.priority} />
            <span className="max-w-full break-words rounded-full border border-border px-2 py-0.5">{task.category}</span>
            <span className="min-w-0 break-words">{task.assignee}</span>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          Completed {formatReportDate(completionDate(task))}
        </span>
      </div>
      <p className="mt-2 break-words text-xs leading-relaxed sm:text-sm">
        <span className="font-medium text-foreground">Result </span>
        {result ? (
          <span className="break-words">{result}</span>
        ) : (
          <span className="text-muted-foreground">No result recorded</span>
        )}
      </p>
    </div>
  );
}

function FilterOptions({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">None in this window.</p>;
  }
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm">
          <Checkbox
            checked={selected.includes(option)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, option] : selected.filter((item) => item !== option))
            }
          />
          {option}
        </label>
      ))}
      {selected.length > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
          Clear
        </Button>
      )}
    </div>
  );
}

function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {label}
          {selected.length > 0 && (
            <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{selected.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-fit max-w-[min(20rem,calc(100vw-2rem))] space-y-2 p-3">
        <FilterOptions options={options} selected={selected} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
