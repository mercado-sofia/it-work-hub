import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Eye, FileSpreadsheet, FileText, Loader2, Paperclip, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PriorityBadge } from "@/components/status-badges";
import { RequestStatusBadge } from "@/components/request-badges";
import { cn } from "@/lib/utils";
import {
  IT_PRIORITIES,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  displayRequestType,
  type IntakeRequestListItem,
  type ItPriority,
  type RequestStatus,
  type RequestType,
} from "@/data/requests";
import { listCatalogFn, listRequestsFn } from "@/lib/request-functions";
import { formatDate } from "@/lib/metrics";
import { RequestsListSkeleton } from "@/components/skeletons";
import { PageHeading } from "@/components/PageHeading";

export const Route = createFileRoute("/_app/requests/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery({
      queryKey: ["it-requests"],
      queryFn: () => listRequestsFn(),
    });
    void context.queryClient.prefetchQuery({
      queryKey: ["request-catalog"],
      queryFn: () => listCatalogFn(),
    });
  },
  head: () => ({
    meta: [
      { title: "IT Requests | TrackHub" },
      {
        name: "description",
        content: "Triage incoming department requests, set IT priority, and convert accepted work into tracker activities.",
      },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const list = useQuery({ queryKey: ["it-requests"], queryFn: () => listRequestsFn() });
  const catalog = useQuery({ queryKey: ["request-catalog"], queryFn: () => listCatalogFn() });
  const [query, setQuery] = useState("");
  const [priorities, setPriorities] = useState<ItPriority[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [types, setTypes] = useState<RequestType[]>([]);
  const [statuses, setStatuses] = useState<RequestStatus[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list.data ?? []).filter((row) => {
      if (
        q &&
        !`${row.ticket} ${row.title} ${row.note} ${row.requesterName} ${row.requesterEmail} ${row.department} ${row.module}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      if (priorities.length && !priorities.includes(row.itPriority)) return false;
      if (departments.length && !departments.includes(row.department)) return false;
      if (modules.length && !modules.includes(row.module)) return false;
      if (types.length && !types.includes(displayRequestType(row.type))) return false;
      if (statuses.length && !statuses.includes(row.status)) return false;
      return true;
    });
  }, [list.data, query, priorities, departments, modules, types, statuses]);

  const departmentOptions = (catalog.data?.departments ?? []).map((item) => item.name);
  const moduleOptions = (catalog.data?.modules ?? []).map((item) => item.name);
  const activeFilterCount =
    priorities.length + departments.length + modules.length + types.length + statuses.length;

  const filterControls = (
    <>
      <MultiFilter label="IT priority" options={IT_PRIORITIES} selected={priorities} onChange={setPriorities} />
      <MultiFilter label="Department" options={departmentOptions} selected={departments} onChange={setDepartments} />
      <MultiFilter label="Module" options={moduleOptions} selected={modules} onChange={setModules} />
      <MultiFilter label="Type" options={REQUEST_TYPES} selected={types} onChange={setTypes} />
      <MultiFilter label="Status" options={REQUEST_STATUSES} selected={statuses} onChange={setStatuses} />
    </>
  );

  const runExport = async (kind: "xlsx" | "pdf") => {
    if (rows.length === 0) return;
    setBusy(kind);
    try {
      if (kind === "xlsx") {
        const { exportRequestsWorkbook } = await import("@/lib/export-excel");
        await exportRequestsWorkbook(rows);
        toast.success("Requests workbook downloaded");
      } else {
        const { exportRequestsPdf } = await import("@/lib/export-pdf");
        const { getSettingsFn } = await import("@/lib/request-functions");
        const settings = await getSettingsFn();
        await exportRequestsPdf(rows, settings.departmentName);
        toast.success("Requests PDF downloaded");
      }
    } catch (error) {
      console.error(error);
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const canExport = !list.isLoading && rows.length > 0 && busy === null;

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <PageHeading
        title="Requests"
        accent={false}
        subtitle={
          <>
            <span className="block text-sm lg:hidden">Incoming tickets from the form.</span>
            <span className="hidden lg:inline">
              Incoming tickets from the submit form. Open a request to read the note, details, and attached files.
            </span>
          </>
        }
        actions={
          <div className="flex shrink-0 flex-wrap justify-end gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 max-lg:rounded-full"
              disabled={!canExport}
              onClick={() => void runExport("xlsx")}
            >
              {busy === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
              <span className="sm:hidden">Excel</span>
              <span className="hidden sm:inline">Download Excel</span>
            </Button>
            <Button
              size="sm"
              className="gap-2 max-lg:rounded-full"
              disabled={!canExport}
              onClick={() => void runExport("pdf")}
            >
              {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              <span className="sm:hidden">PDF</span>
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
          </div>
        }
      />

      <Card className="max-md:rounded-3xl max-md:border-0 max-md:shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center max-md:p-3">
          <div className="relative w-full min-w-0 flex-1 md:min-w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tickets, titles, requesters…"
            className={cn("rounded-full pl-9 max-md:h-11", query && "pr-9")}
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
            className="h-11 gap-2 rounded-full md:hidden"
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
          <div className="hidden flex-wrap items-center gap-3 md:flex">{filterControls}</div>
        </CardContent>
      </Card>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="flex w-[min(16rem,72vw)] flex-col gap-5 overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              <span className="sm:hidden">Filter the list.</span>
              <span className="hidden sm:inline">Narrow requests by priority, department, and status.</span>
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">IT priority</p>
              <FilterOptions options={IT_PRIORITIES} selected={priorities} onChange={setPriorities} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Department</p>
              <FilterOptions options={departmentOptions} selected={departments} onChange={setDepartments} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Module</p>
              <FilterOptions options={moduleOptions} selected={modules} onChange={setModules} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Type</p>
              <FilterOptions options={REQUEST_TYPES} selected={types} onChange={setTypes} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <FilterOptions options={REQUEST_STATUSES} selected={statuses} onChange={setStatuses} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {list.isLoading && !list.data ? (
        <RequestsListSkeleton />
      ) : (
        <div className="contents">
      <div className="space-y-2.5 md:hidden">
        {rows.map((row) => (
          <RequestCard key={row.id} row={row} />
        ))}
        {!list.isLoading && rows.length === 0 && (
          <div className="rounded-3xl bg-card px-4 py-10 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">No requests match the current filters.</p>
          </div>
        )}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-max min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Ticket</th>
                  <th className="min-w-72 px-3 py-2.5 font-medium">Request</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Requester</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Type</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Department</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Submitted</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Urgency</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">IT priority</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Status</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Files</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      <Link to="/requests/$ticket" params={{ ticket: row.ticket }} className="text-primary hover:underline">
                        {row.ticket}
                      </Link>
                    </td>
                    <td className="min-w-72 px-3 py-3">
                      <p className="font-medium leading-snug">{row.title}</p>
                      <p className="text-xs text-muted-foreground">Affected module: {row.module}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <p className="leading-snug">{row.requesterName}</p>
                      <p className="text-xs text-muted-foreground">{row.requesterEmail}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{displayRequestType(row.type)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{row.department}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {formatDate(row.createdAt.slice(0, 10))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <PriorityBadge priority={row.urgency === "High" ? "High" : row.urgency === "Low" ? "Low" : "Medium"} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <PriorityBadge priority={row.itPriority} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <RequestStatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="size-3.5" />
                        {row.attachmentCount}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Button asChild variant="outline" size="sm" className="gap-1.5 px-2.5">
                        <Link
                          to="/requests/$ticket"
                          params={{ ticket: row.ticket }}
                          aria-label={`View ${row.ticket}`}
                        >
                          <Eye className="size-3.5" />
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!list.isLoading && rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No requests match the current filters.</p>
          )}
        </CardContent>
      </Card>
        </div>
      )}
    </div>
  );
}

function RequestCard({ row }: { row: IntakeRequestListItem }) {
  return (
    <Link
      to="/requests/$ticket"
      params={{ ticket: row.ticket }}
      className="block min-w-0 rounded-3xl bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium tabular-nums text-muted-foreground">{row.ticket}</p>
            <RequestStatusBadge className="shrink-0" status={row.status} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
            {row.title}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {row.requesterName} · {row.department}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <PriorityBadge priority={row.itPriority} />
            <span className="text-xs text-muted-foreground">{displayRequestType(row.type)}</span>
            <span className="text-xs text-muted-foreground">{formatDate(row.createdAt.slice(0, 10))}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" />
              {row.attachmentCount}
            </span>
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      </div>
    </Link>
  );
}

function FilterOptions<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">None available.</p>;
  }
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label key={option} className="flex min-w-0 cursor-pointer items-start gap-2 text-sm">
          <Checkbox
            checked={selected.includes(option)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, option] : selected.filter((item) => item !== option))
            }
          />
          <span className="min-w-0 break-words">{option}</span>
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

function MultiFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
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
