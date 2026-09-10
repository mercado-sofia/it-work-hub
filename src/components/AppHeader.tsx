import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, ShieldCheck, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTasks } from "@/lib/task-store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/tracker", label: "Master Tracker" },
  { to: "/accomplishments", label: "Accomplishments" },
] as const;

export function AppHeader() {
  const { tasks, mode, setMode } = useTasks();
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const runExport = async (kind: "xlsx" | "pdf") => {
    setBusy(kind);
    try {
      if (kind === "xlsx") {
        const { exportWorkbook } = await import("@/lib/export-excel");
        await exportWorkbook(tasks);
        toast.success("Excel workbook downloaded");
      } else {
        const { exportExecutivePdf } = await import("@/lib/export-pdf");
        await exportExecutivePdf(tasks);
        toast.success("Executive brief downloaded");
      }
    } catch (error) {
      console.error(error);
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-primary-foreground/10 text-sm font-bold tracking-tight">
            IT
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">IT Work Monitoring &amp; Tracking</p>
            <p className="text-xs text-primary-foreground/70">Information Technology Department</p>
          </div>
        </Link>

        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:pl-6">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground/75 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
              activeProps={{ className: "bg-primary-foreground/15 !text-primary-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center rounded-md bg-primary-foreground/10 p-0.5 md:flex">
            {(
              [
                { id: "management", label: "Management", icon: ShieldCheck },
                { id: "editor", label: "IT Editor", icon: Pencil },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                  mode === id
                    ? "bg-background text-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Export &amp; Reports
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Leadership handouts</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void runExport("xlsx")} className="gap-2">
                <FileSpreadsheet className="size-4" />
                <div>
                  <p className="text-sm font-medium">Export to Excel (.xlsx)</p>
                  <p className="text-xs text-muted-foreground">3-sheet formatted workbook</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void runExport("pdf")} className="gap-2">
                <FileText className="size-4" />
                <div>
                  <p className="text-sm font-medium">Executive PDF handout</p>
                  <p className="text-xs text-muted-foreground">1–2 page status brief</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mode === "management" && (
        <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning sm:px-6">
          Management Mode — read-only executive view. Switch to IT Editor Mode to make changes.
        </div>
      )}
    </header>
  );
}
