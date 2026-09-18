import { Link } from "@tanstack/react-router";
import { useRef, useState, type RefObject } from "react";
import {
  Database,
  Download,
  FileInput,
  FileJson,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Upload,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/user-facing-error";
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
import { parseBackup, type BackupPayload } from "@/lib/local-db";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTasks } from "@/lib/task-store";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tracker", label: "Master Tracker" },
  { to: "/requests", label: "Requests" },
  { to: "/accomplishments", label: "Accomplishments" },
] as const;

export function AppHeader() {
  const {
    tasks,
    sprints,
    mode,
    canWrite,
    needsExportReminder,
    dismissExportReminder,
    markExported,
    exportBackup,
    importBackup,
    importLegacyBrowserData,
    loadSampleData,
  } = useTasks();
  const { user, logout, signingOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [backupConfirm, setBackupConfirm] = useState<
    { kind: "restore"; payload: BackupPayload } | { kind: "legacy" } | { kind: "sample" } | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const signOut = async () => {
    if (signingOut) return;
    try {
      await logout();
    } catch (error) {
      toastError(error, "Could not sign out. Please try again.");
    }
  };

  const runExport = async (kind: "xlsx" | "pdf") => {
    setBusy(kind);
    try {
      if (kind === "xlsx") {
        const { exportWorkbook } = await import("@/lib/export-excel");
        await exportWorkbook(tasks, sprints);
        toast.success("Excel workbook downloaded");
      } else {
        const { exportExecutivePdf } = await import("@/lib/export-pdf");
        const { getSettingsFn } = await import("@/lib/request-functions");
        const settings = await getSettingsFn();
        await exportExecutivePdf(tasks, settings.departmentName);
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
    onRequestLegacyImport: () => setBackupConfirm({ kind: "legacy" }),
    onRequestSampleData: () => setBackupConfirm({ kind: "sample" }),
  };

  const confirmBackup = () => {
    if (!backupConfirm) return;
    if (backupConfirm.kind === "restore") {
      importBackup(backupConfirm.payload);
      toast.success("Backup restored");
    } else if (backupConfirm.kind === "legacy") {
      const imported = importLegacyBrowserData();
      toast.success(imported ? "Imported data from this browser" : "No previous browser data to import");
    } else {
      loadSampleData();
      toast.success("Sample activities loaded");
    }
    setBackupConfirm(null);
  };

  return (
    <>
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
            className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
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

        <Link to="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
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
                  setBackupConfirm({ kind: "restore", payload: parseBackup(JSON.parse(text)) });
                } catch (error) {
                  toastError(error, "This file isn’t a valid backup.");
                }
              });
            }}
          />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <BackupMenu {...backupProps} />
            <ExportMenu busy={busy} runExport={runExport} />
          </div>
          <UserMenu
            name={user?.displayName ?? "IT"}
            role={user?.role ?? "staff"}
            signingOut={signingOut}
            onLogout={signOut}
          />
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
          className="flex w-[min(16rem,72vw)] flex-col gap-5 overflow-y-auto bg-card p-6 text-card-foreground sm:gap-6"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              <span className="sm:hidden">Navigate and export.</span>
              <span className="hidden sm:inline">Navigate and export data.</span>
            </SheetDescription>
          </SheetHeader>

          <nav className="flex flex-col gap-1.5">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                stacked
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
            <NavLink to="/settings" label="Settings" stacked onNavigate={() => setMenuOpen(false)} />
          </nav>

          <div className="space-y-3 border-t border-border pt-5">
            <div className="space-y-1 px-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account
              </p>
              <p className="truncate text-sm font-medium">{user?.displayName}</p>
              <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
            </div>
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>

          {canWrite && (
            <div className="mt-auto flex flex-col gap-2 border-t border-border pt-5">
              <BackupMenu {...backupProps} fullWidth />
              <ExportMenu busy={busy} runExport={runExport} fullWidth />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {mode === "management" && (
        <div className="border-t border-[#060d28] bg-[#0B1438] px-4 py-1.5 text-center text-xs font-medium text-white sm:px-6">
          <span className="sm:hidden">Management — read-only view.</span>
          <span className="hidden sm:inline">Management — read-only executive view.</span>
        </div>
      )}
    </header>

    <ConfirmDialog
      open={backupConfirm !== null}
      onOpenChange={(open) => {
        if (!open) setBackupConfirm(null);
      }}
      icon={Database}
      title={
        backupConfirm?.kind === "restore"
          ? "Restore Backup"
          : backupConfirm?.kind === "legacy"
            ? "Import Browser Data"
            : "Load Sample Data"
      }
      description={
        backupConfirm?.kind === "restore"
          ? "You’re going to replace tracker activities, sprints, and staff in this browser with the backup file. Are you sure?"
          : backupConfirm?.kind === "legacy"
            ? "You’re going to replace the current tracker data in this browser with an earlier local copy, if one exists. Are you sure?"
            : "You’re going to replace current tracker activities with sample records. Existing work in this browser will be overwritten. Are you sure?"
      }
      confirmLabel={
        backupConfirm?.kind === "restore"
          ? "Confirm restore"
          : backupConfirm?.kind === "legacy"
            ? "Confirm import"
            : "Confirm load"
      }
      onConfirm={confirmBackup}
    />
    </>
  );
}

function NavLink({
  to,
  label,
  stacked,
  onNavigate,
}: {
  to: "/dashboard" | "/tracker" | "/requests" | "/accomplishments" | "/settings";
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
      activeOptions={{ exact: to === "/dashboard" }}
    >
      {label}
    </Link>
  );
}

function UserMenu({
  name,
  role,
  signingOut,
  onLogout,
}: {
  name: string;
  role: string;
  signingOut: boolean;
  onLogout: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden rounded-full px-2.5 lg:inline-flex"
          aria-label={`Account menu for ${name}`}
          title={name}
        >
          <User className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max min-w-36">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="whitespace-nowrap">{name}</p>
          <p className="text-xs font-normal capitalize text-muted-foreground">{role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="gap-2">
            <Settings className="size-3.5" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" disabled={signingOut} onSelect={() => void onLogout()}>
          {signingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BackupMenu({
  canWrite,
  fileRef,
  exportBackup,
  onRequestLegacyImport,
  onRequestSampleData,
  fullWidth,
}: {
  canWrite: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  exportBackup: () => void;
  onRequestLegacyImport: () => void;
  onRequestSampleData: () => void;
  fullWidth?: boolean;
}) {
  if (!canWrite) return null;

  const itemClass = "gap-2 py-1 text-xs [&>svg]:size-3.5";

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
        <DropdownMenuContent align="end" className="flex w-max flex-col gap-1.5 p-1.5">
          <DropdownMenuLabel className="text-xs">Data backup</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => exportBackup()} className={itemClass}>
            <FileJson />
            Download JSON backup
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()} className={itemClass}>
            <FileInput />
            Restore from JSON
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClass} onSelect={onRequestLegacyImport}>
            <HardDrive />
            Import from this browser
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClass} onSelect={onRequestSampleData}>
            <Database />
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
  const itemClass = "items-start gap-2 py-1 text-xs [&>svg]:mt-0.5 [&>svg]:size-3.5";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={cn("gap-2 rounded-full", fullWidth && "w-full")}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex w-56 flex-col gap-1.5 p-1.5">
        <DropdownMenuLabel className="text-xs">Leadership handouts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void runExport("xlsx")} className={itemClass}>
          <FileSpreadsheet />
          <div>
            <p className="text-xs font-medium">Export to Excel (.xlsx)</p>
            <p className="text-xs text-muted-foreground">Summary, tracker, and monthly accomplishments</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void runExport("pdf")} className={itemClass}>
          <FileText />
          <div>
            <p className="text-xs font-medium">Executive PDF handout</p>
            <p className="text-xs text-muted-foreground">1–2 page status brief</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
