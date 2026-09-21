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
  Upload,
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
import { parseBackup, type BackupPayload } from "@/lib/local-db";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTasks } from "@/lib/task-store";
import { cn } from "@/lib/utils";

export function BackupControls({ className, fullWidth }: { className?: string; fullWidth?: boolean }) {
  const { canWrite, exportBackup, importBackup, importLegacyBrowserData, loadSampleData } = useTasks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupConfirm, setBackupConfirm] = useState<
    { kind: "restore"; payload: BackupPayload } | { kind: "legacy" } | { kind: "sample" } | null
  >(null);

  if (!canWrite) return null;

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
    <div className={className}>
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
      <BackupMenu
        fileRef={fileRef}
        exportBackup={exportBackup}
        onRequestLegacyImport={() => setBackupConfirm({ kind: "legacy" })}
        onRequestSampleData={() => setBackupConfirm({ kind: "sample" })}
        fullWidth={Boolean(fullWidth)}
      />
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
    </div>
  );
}

function BackupMenu({
  fileRef,
  exportBackup,
  onRequestLegacyImport,
  onRequestSampleData,
  fullWidth,
}: {
  fileRef: RefObject<HTMLInputElement | null>;
  exportBackup: () => void;
  onRequestLegacyImport: () => void;
  onRequestSampleData: () => void;
  fullWidth?: boolean;
}) {
  const itemClass = "gap-2 py-1 text-xs [&>svg]:size-3.5";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2 rounded-full", fullWidth && "w-full")}>
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

export function ExportMenu({ className, fullWidth }: { className?: string; fullWidth?: boolean }) {
  const { tasks, sprints, markExported } = useTasks();
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);
  const itemClass = "items-start gap-2 py-1 text-xs [&>svg]:mt-0.5 [&>svg]:size-3.5";

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

  return (
    <div className={className}>
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
              <p className="text-xs text-muted-foreground">Summary, tracker, and monthly reports</p>
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
    </div>
  );
}
