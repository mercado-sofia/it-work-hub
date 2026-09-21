import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Search,
  SlidersHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PriorityBadge } from "@/components/status-badges";
import { ActivityIdLink, WorkId } from "@/components/activity-refs";
import { PageHeading } from "@/components/PageHeading";
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
import { cn } from "@/lib/utils";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const activeFilterCount = categoryFilters.length + ownerFilters.length;

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
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden max-lg:space-y-5">
      <div className="flex min-w-0 flex-col gap-3 max-lg:gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeading
          className="min-w-0 flex-1"
          title="Accomplishments"
          desktopTitle="Accomplishments & Reports"
          accent={false}
          hideSubtitleOnMobile
          subtitle={hydrated ? `Completed tracker activities for ${periodText}.` : "\u00a0"}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="min-w-28 shrink-0 justify-center gap-2 self-start rounded-full print:hidden lg:self-auto" disabled={!canExport}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flex w-56 flex-col gap-1.5 p-1.5">
            <DropdownMenuLabel className="text-xs">Accomplishments report</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="items-start gap-2 py-1 text-xs [&>svg]:mt-0.5 [&>svg]:size-3.5"
              onSelect={() => void runExport("xlsx")}
            >
              <FileSpreadsheet />
              <div>
                <p className="text-xs font-medium">Excel workbook (.xlsx)</p>
                <p className="text-xs text-muted-foreground">Filtered accomplishment details</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="items-start gap-2 py-1 text-xs [&>svg]:mt-0.5 [&>svg]:size-3.5"
              onSelect={() => void runExport("pdf")}
            >
              <FileText />
              <div>
                <p className="text-xs font-medium">PDF report</p>
                <p className="text-xs text-muted-foreground">Leadership-ready period brief</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="min-w-0 border-border print:hidden max-lg:rounded-3xl max-lg:shadow-sm">
        <CardContent className="space-y-4 overflow-x-hidden p-4 sm:p-5 max-lg:p-3">
          <fieldset className="w-full min-w-0 space-y-3 [min-inline-size:0]">
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
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
              <div className="w-full min-w-0 space-y-1.5 sm:w-52">
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
                  className="w-full min-w-0 max-w-full max-lg:h-11"
                />
              </div>
              <div className="w-full min-w-0 space-y-1.5 sm:w-52">
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
                  className="w-full min-w-0 max-w-full max-lg:h-11"
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
                className={cn("rounded-full pl-9 max-lg:h-11", query && "pr-9")}
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
            <Button
              variant="outline"
              size="sm"
              className="h-11 gap-2 rounded-full lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <div className="hidden flex-wrap items-center gap-3 lg:flex">
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
          </div>
        </CardContent>
      </Card>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="flex w-[min(16rem,72vw)] flex-col gap-5 overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow completions by category and owner.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Category</p>
              <FilterOptions options={categoryOptions} selected={categoryFilters} onChange={setCategoryFilters} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Owner</p>
              <FilterOptions options={ownerOptions} selected={ownerFilters} onChange={setOwnerFilters} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
    <Card className="border-border max-lg:rounded-3xl max-lg:shadow-sm">
      <CardContent className="p-5 max-lg:p-3 sm:max-lg:p-4">
        <div className="lg:hidden">
          <div className="flex items-center gap-2 max-[380px]:flex-col max-[380px]:items-start">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 max-[380px]:size-8">
              <Icon className="size-5 text-primary max-[380px]:size-4" strokeWidth={1.75} />
            </span>
            <p className="font-display text-2xl font-bold tabular-nums leading-none max-[380px]:text-xl">{value}</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-[380px]:text-xs">{label}</p>
        </div>
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
          </div>
          <Icon className="size-8 text-primary" strokeWidth={1.6} />
        </div>
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
    <>
      <details
        className="accomplishment-month group lg:hidden"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 px-1 py-1 [&::-webkit-details-marker]:hidden">
          <h2 className="min-w-0 break-words font-display text-sm font-semibold tracking-tight">{month}</h2>
          <span className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">{items.length} completed</span>
            <ChevronDown className="month-chevron size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="mt-2.5 space-y-2.5">
          {items.map((task) => (
            <AccomplishmentRow key={task.id} task={task} />
          ))}
        </div>
      </details>

      <Card className="hidden min-w-0 border-border lg:block">
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
    </>
  );
}

function AccomplishmentRow({ task }: { task: Task }) {
  const ticket = task.requestRef?.trim();
  const result = task.remarks.trim();
  const completed = formatReportDate(completionDate(task));
  const idEl = ticket ? <WorkId work={task} className="text-xs" /> : <ActivityIdLink id={task.id} className="text-xs" />;

  return (
    <>
      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-medium tabular-nums text-muted-foreground">{idEl}</p>
          <span className="shrink-0 text-xs text-muted-foreground">{completed}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{task.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {task.assignee} · {task.category}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <PriorityBadge priority={task.priority} />
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed">
          <span className="font-medium text-foreground">Result </span>
          {result ? (
            <span className="break-words">{result}</span>
          ) : (
            <span className="text-muted-foreground">No result recorded</span>
          )}
        </p>
      </div>

      <div className="hidden min-w-0 rounded-lg border border-border p-3 sm:p-4 lg:block">
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
          <span className="shrink-0 text-xs text-muted-foreground">Completed {completed}</span>
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
    </>
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
