import { Link } from "@tanstack/react-router";
import { useRef, useState, type RefObject } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Menu,
  Moon,
  Pencil,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { parseBackup } from "@/lib/local-db";
import { useTasks } from "@/lib/task-store";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/tracker", label: "Master Tracker" },
  { to: "/accomplishments", label: "Accomplishments" },
] as const;

const modes = [
  { id: "management", label: "Management", icon: ShieldCheck },
  { id: "editor", label: "IT Editor", icon: Pencil },
] as const;

export function AppHeader() {
  const {
    tasks,
    sprints,
    mode,
    setMode,
    canWrite,
    needsExportReminder,
    dismissExportReminder,
    markExported,
    exportBackup,
    importBackup,
    importLegacyBrowserData,
    loadSampleData,
  } = useTasks();
  const { theme, toggleTheme } = useTheme();
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const runExport = async (kind: "xlsx" | "pdf") => {
    setBusy(kind);
    try {
      if (kind === "xlsx") {
        const { exportWorkbook } = await import("@/lib/export-excel");
        await exportWorkbook(tasks, sprints);
        toast.success("Excel workbook downloaded");
      } else {
        const { exportExecutivePdf } = await import("@/lib/export-pdf");
        await exportExecutivePdf(tasks);
        toast.success("Executive brief downloaded");
      }
      markExported();
    } catch (error) {
      console.error(error);
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const backupProps = {
    canWrite,
    fileRef,
    exportBackup,
    importLegacyBrowserData,
    loadSampleData,
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card text-foreground print:hidden">
      {needsExportReminder && (
        <div className="flex items-start justify-center gap-3 border-b border-border bg-warning-soft px-4 py-1.5 text-xs text-foreground sm:items-center sm:px-6">
          <p className="min-w-0 flex-1 text-center sm:flex-none">
            <span className="sm:hidden">Backup reminder: download Excel or JSON. Data stays in this browser.</span>
            <span className="hidden sm:inline">
              Backup reminder: download Excel or JSON. Data lives in this browser and is not stored on a
              server.
            </span>
          </p>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss backup reminder"
            onClick={dismissExportReminder}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="size-5" />
        </Button>

        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
          <img src="/it-logo.png" alt="TrackHub" className="size-9 rounded-full object-cover" />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">TrackHub</p>
            <p className="hidden text-xs text-muted-foreground sm:block">IT Department</p>
          </div>
        </Link>

        <nav className="ml-3 hidden min-w-0 items-center gap-1 lg:flex">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        {canWrite && (
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void file.text().then((text) => {
                try {
                  importBackup(parseBackup(JSON.parse(text)));
                  toast.success("Backup restored");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Import failed.");
                }
              });
            }}
          />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <ModeToggle mode={mode} setMode={setMode} />
            <BackupMenu {...backupProps} />
            <ExportMenu busy={busy} runExport={runExport} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full px-2.5"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="flex w-[min(16rem,72vw)] flex-col gap-6 overflow-y-auto bg-card text-card-foreground"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              <span className="sm:hidden">Navigate and export.</span>
              <span className="hidden sm:inline">Navigate, switch mode, and export data.</span>
            </SheetDescription>
          </SheetHeader>

          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                stacked
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
          </nav>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mode</p>
            <ModeToggle mode={mode} setMode={setMode} stacked />
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
            <BackupMenu {...backupProps} fullWidth />
            <ExportMenu busy={busy} runExport={runExport} fullWidth />
          </div>
        </SheetContent>
      </Sheet>

      {mode === "management" && (
        <div className="border-t border-[#060d28] bg-[#0B1438] px-4 py-1.5 text-center text-xs font-medium text-white sm:px-6">
          <span className="sm:hidden">Management Mode — read-only. Switch to IT Editor to make changes.</span>
          <span className="hidden sm:inline">
            Management Mode — read-only executive view. Switch to IT Editor Mode to make changes.
          </span>
        </div>
      )}
    </header>
  );
}

function NavLink({
  to,
  label,
  stacked,
  onNavigate,
}: {
  to: (typeof nav)[number]["to"];
  label: string;
  stacked?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "font-medium text-muted-foreground hover:text-foreground",
        stacked
          ? "rounded-lg px-3 py-2.5 text-sm"
          : "shrink-0 rounded-full px-3.5 py-1.5 text-sm",
      )}
      activeProps={{
        className: stacked
          ? "rounded-lg bg-muted px-3 py-2.5 text-sm font-semibold text-primary"
          : "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold text-primary !text-primary",
      }}
      activeOptions={{ exact: to === "/" }}
    >
      {label}
    </Link>
  );
}

function ModeToggle({
  mode,
  setMode,
  stacked,
}: {
  mode: "management" | "editor";
  setMode: (id: "management" | "editor") => void;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex rounded-lg bg-muted/80 p-0.5",
        stacked ? "flex-col gap-0.5" : "flex-row items-center rounded-full",
      )}
    >
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMode(id)}
          aria-label={label}
          title={label}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium",
            stacked
              ? "w-full justify-start rounded-md py-2"
              : "flex-1 justify-center rounded-full",
            mode === id ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}

function BackupMenu({
  canWrite,
  fileRef,
  exportBackup,
  importLegacyBrowserData,
  loadSampleData,
  fullWidth,
}: {
  canWrite: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  exportBackup: () => void;
  importLegacyBrowserData: () => boolean;
  loadSampleData: () => void;
  fullWidth?: boolean;
}) {
  if (!canWrite) return null;

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2 rounded-full", fullWidth && "w-full")}
          >
            <Upload className="size-4" />
            Backup
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Data backup</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => exportBackup()}>Download JSON backup</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            Restore from JSON
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              const imported = importLegacyBrowserData();
              toast.success(
                imported ? "Imported data from this browser" : "No previous browser data to import",
              );
            }}
          >
            Import from this browser
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              loadSampleData();
              toast.success("Sample activities loaded");
            }}
          >
            Load sample data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}

function ExportMenu({
  busy,
  runExport,
  fullWidth,
}: {
  busy: "xlsx" | "pdf" | null;
  runExport: (kind: "xlsx" | "pdf") => void;
  fullWidth?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={cn("gap-2 rounded-full", fullWidth && "w-full")}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Leadership handouts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void runExport("xlsx")} className="gap-2">
          <FileSpreadsheet className="size-4" />
          <div>
            <p className="text-sm font-medium">Export to Excel (.xlsx)</p>
            <p className="text-xs text-muted-foreground">Summary, tracker, and monthly accomplishments</p>
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
  );
}
