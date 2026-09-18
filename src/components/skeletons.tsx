import type { ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function times(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}

function BusyRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <Card className="border-border">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
        <Skeleton className="size-8 rounded-md" />
      </CardContent>
    </Card>
  );
}

function FilterChipSkeleton() {
  return <Skeleton className="h-8 w-[5.5rem] rounded-md" />;
}

function TableRowSkeleton({
  columns,
  widths,
}: {
  columns: number;
  widths?: string[];
}) {
  return (
    <tr className="border-b border-border last:border-0">
      {times(columns).map((index) => (
        <td key={index} className="px-3 py-3 first:pl-4 last:pr-4">
          <Skeleton className={cn("h-4", widths?.[index] ?? "w-20")} />
        </td>
      ))}
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <BusyRegion label="Loading dashboard" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {times(4).map((index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <Card className="flex h-full min-w-0 flex-col border-border">
          <CardHeader className="shrink-0 pb-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3 w-48" />
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center p-5">
            <Skeleton className="size-40 rounded-full sm:size-52" />
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="grid min-w-0 gap-3 sm:grid-cols-2">
            {times(4).map((index) => (
              <div key={index} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="size-5 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-2 w-full rounded-full" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-28" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {times(3).map((index) => (
              <div key={index} className="rounded-lg border border-border p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-40" />
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="mt-3 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Activity</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="w-40 px-3 py-2.5 font-medium">Progress</th>
                  <th className="px-5 py-2.5 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {times(5).map((index) => (
                  <TableRowSkeleton
                    key={index}
                    columns={7}
                    widths={["w-16", "w-40", "w-20", "w-14", "w-16", "w-28", "w-20"]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-6 w-32 rounded-full" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0 md:hidden">
            {times(2).map((index) => (
              <div key={index} className="flex gap-3 border-b border-border/70 px-4 py-3 last:border-0">
                <Skeleton className="h-5 w-8 rounded-md" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-40" />
                  <div className="mt-2 flex justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-5 py-2.5">Rank</th>
                  <th className="px-3 py-2.5">Activity</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Progress</th>
                  <th className="px-5 py-2.5">Target</th>
                </tr>
              </thead>
              <tbody>
                {times(2).map((index) => (
                  <TableRowSkeleton
                    key={index}
                    columns={6}
                    widths={["w-8", "w-40", "w-20", "w-16", "w-12", "w-20"]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="mt-3 h-6 w-28 rounded-full" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {times(2).map((index) => (
              <div key={index} className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-5 w-8 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="mt-2 h-5 w-16" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-28" />
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-5 py-2.5">Rank</th>
                  <th className="px-3 py-2.5">Activity</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Priority</th>
                  <th className="px-3 py-2.5">Situation</th>
                  <th className="px-5 py-2.5">Target</th>
                </tr>
              </thead>
              <tbody>
                {times(2).map((index) => (
                  <TableRowSkeleton
                    key={index}
                    columns={6}
                    widths={["w-8", "w-44", "w-20", "w-14", "w-12", "w-20"]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </BusyRegion>
  );
}

export function TrackerSkeleton() {
  return (
    <BusyRegion label="Loading tracker" className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <Skeleton className="h-9 w-full flex-1" />
          <div className="hidden flex-wrap items-center gap-3 md:flex">
            {times(5).map((index) => (
              <FilterChipSkeleton key={index} />
            ))}
          </div>
          <Skeleton className="h-8 w-24 md:hidden" />
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {times(4).map((index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1140px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Activity</th>
                  <th className="px-3 py-2.5 font-medium">Sprint</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Progress</th>
                  <th className="px-3 py-2.5 font-medium">Started</th>
                  <th className="px-3 py-2.5 font-medium">Target</th>
                  <th className="px-4 py-2.5 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {times(6).map((index) => (
                  <TableRowSkeleton
                    key={index}
                    columns={10}
                    widths={["w-16", "w-44", "w-20", "w-20", "w-14", "w-20", "w-24", "w-16", "w-16", "w-32"]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </BusyRegion>
  );
}

export function AccomplishmentsSkeleton() {
  return (
    <BusyRegion label="Loading accomplishments" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {times(3).map((index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>
      <Card className="border-border">
        <CardContent className="flex flex-wrap items-center gap-2 p-4 sm:p-5">
          <Skeleton className="h-3 w-24" />
          {times(4).map((index) => (
            <Skeleton key={index} className="h-6 w-24 rounded-full" />
          ))}
        </CardContent>
      </Card>
      <Card className="border-border">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
          {times(3).map((index) => (
            <div key={index} className="rounded-lg border border-border p-3 sm:p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-48" />
              <Skeleton className="mt-3 h-3 w-full" />
            </div>
          ))}
        </div>
      </Card>
    </BusyRegion>
  );
}

export function RequestsListSkeleton() {
  return (
    <BusyRegion label="Loading requests">
      <div className="space-y-3 md:hidden">
        {times(5).map((index) => (
          <Card key={index}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-max min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Ticket</th>
                  <th className="px-3 py-2.5 font-medium">Request</th>
                  <th className="px-3 py-2.5 font-medium">Requester</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Department</th>
                  <th className="px-3 py-2.5 font-medium">Submitted</th>
                  <th className="px-3 py-2.5 font-medium">Urgency</th>
                  <th className="px-3 py-2.5 font-medium">IT priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Files</th>
                  <th className="px-3 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {times(5).map((index) => (
                  <TableRowSkeleton
                    key={index}
                    columns={11}
                    widths={["w-16", "w-44", "w-28", "w-14", "w-20", "w-16", "w-14", "w-14", "w-16", "w-10", "w-12"]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </BusyRegion>
  );
}

export function RequestDetailSkeleton() {
  return (
    <BusyRegion label="Loading request" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackButton fallback="/requests" />
          <Skeleton className="mt-2 h-6 w-64 sm:w-80" />
          <Skeleton className="mt-2 h-4 w-52" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-4 w-36" />
              <div className="grid gap-3 sm:grid-cols-2">
                {times(6).map((index) => (
                  <div key={index} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-4 w-16" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </BusyRegion>
  );
}

export function AccountCardSkeleton() {
  return (
    <BusyRegion label="Loading account">
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {times(2).map((index) => (
              <div key={index} className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </BusyRegion>
  );
}

export function DepartmentFieldsSkeleton() {
  return (
    <BusyRegion label="Loading department contact" className="grid gap-4 sm:grid-cols-2">
      {times(4).map((index) => (
        <div key={index} className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </BusyRegion>
  );
}

export function TeamListSkeleton() {
  return (
    <BusyRegion label="Loading team">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Loading IT team members</caption>
          <thead>
            <tr className="border-y border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-6 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-6 py-2.5 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {times(4).map((index) => (
              <TableRowSkeleton
                key={index}
                columns={5}
                widths={["w-28", "w-40", "w-16", "w-16", "w-12"]}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 px-6 pb-6 md:hidden">
        {times(3).map((index) => (
          <div key={index} className="space-y-2 rounded-lg border border-border p-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </BusyRegion>
  );
}

export function LandingSkeleton() {
  return (
    <BusyRegion
      label="Loading portal"
      className="relative min-h-svh overflow-x-hidden bg-white font-sans text-foreground dark:bg-background"
    >
      <header className="sticky top-0 z-40 bg-white print:hidden dark:bg-card">
        <div className="mx-auto flex h-14 min-w-0 max-w-4xl items-center gap-1 px-8 sm:gap-3 sm:px-6">
          <Skeleton className="size-8 rounded-full sm:size-9" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="hidden h-3 w-20 sm:block" />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
      </header>
      <main className="flex min-h-[calc(100svh-3.5rem)] items-start justify-center px-8 py-8 sm:items-center sm:px-6 sm:py-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="mt-3 h-7 w-56 sm:mt-6 sm:h-8 sm:w-96" />
            <Skeleton className="mt-3 h-4 w-64 sm:w-80" />
          </div>
          <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-5">
            {times(2).map((index) => (
              <div
                key={index}
                className="flex flex-col items-center rounded-2xl border-2 border-border bg-card p-4 text-center sm:block sm:p-5 sm:text-left"
              >
                <Skeleton className="size-12 rounded-xl sm:hidden" />
                <Skeleton className="hidden h-24 w-full rounded-xl sm:block" />
                <div className="mt-3 w-full min-w-0 sm:mt-0">
                  <Skeleton className="mx-auto h-5 w-40 sm:mx-0 sm:mt-3" />
                  <Skeleton className="mx-auto mt-2 h-3 w-full max-w-xs sm:mx-0" />
                  <Skeleton className="mx-auto mt-2 h-3 w-5/6 sm:mx-0" />
                  <Skeleton className="mx-auto mt-3 h-8 w-36 rounded-full sm:mx-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </BusyRegion>
  );
}

export function RequestStatusResultSkeleton() {
  return (
    <BusyRegion label="Looking up request" className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-56" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 sm:gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-4">
            {times(3).map((index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="mt-1.5 size-2.5 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </BusyRegion>
  );
}
