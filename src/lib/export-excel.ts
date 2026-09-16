import type { Sprint, Task } from "@/data/tasks";
import {
  getBlockers,
  getCategoryStats,
  getCompleted,
  getMetrics,
  getPriorityActivities,
  monthLabel,
  formatPeriodLabel,
  formatReportDate,
} from "@/lib/metrics";
import { completionDate, activityDisplayId, todayISO } from "@/lib/task-rules";

const BRAND = "FF3B6BFF";
const BRAND_LIGHT = "FF6B8FFF";
const STRIPE = "FFF4F7FE";

type Row = (string | number)[];

export async function exportWorkbook(tasks: Task[], sprints: Sprint[] = []) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "IT Work Monitoring & Tracking System";
  wb.created = new Date();

  const sprintName = (id: string | null) => {
    if (!id) return "Backlog";
    return sprints.find((s) => s.id === id)?.name ?? id;
  };

  const metrics = getMetrics(tasks);
  const generated = new Date().toLocaleString("en-US");

  const styleHeader = (ws: any, rowNumber: number, fill = BRAND) => {
    const row = ws.getRow(rowNumber);
    row.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = { bottom: { style: "thin", color: { argb: BRAND_LIGHT } } };
    });
    row.height = 22;
  };

  const stripe = (ws: any, from: number, to: number) => {
    for (let i = from; i <= to; i++) {
      if ((i - from) % 2 === 1) {
        ws.getRow(i).eachCell((cell: any) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
        });
      }
      ws.getRow(i).alignment = { vertical: "top", wrapText: true };
    }
  };

  const autoWidth = (ws: any, maxWidth = 60) => {
    ws.columns.forEach((col: any) => {
      let width = 10;
      col.eachCell?.({ includeEmpty: false }, (cell: any) => {
        const len = String(cell.value ?? "").length + 2;
        if (len > width) width = len;
      });
      col.width = Math.min(width, maxWidth);
    });
  };

  const title = (ws: any, text: string) => {
    const row = ws.addRow([text]);
    row.font = { bold: true, size: 14, color: { argb: BRAND } };
    row.height = 24;
  };

  /* ---------------- Sheet 1: Management Summary ---------------- */
  const s1 = wb.addWorksheet("Management Summary");
  title(s1, "IT Department — Management Summary");
  s1.addRow([`Generated: ${generated}`]);
  s1.addRow([]);

  s1.addRow(["Metric", "Value"]);
  styleHeader(s1, s1.rowCount);
  const m0 = s1.rowCount + 1;
  s1.addRow(["Activities", metrics.total]);
  s1.addRow(["Completed", metrics.completed]);
  s1.addRow(["In Progress / For Testing", metrics.inProgress]);
  s1.addRow(["On Hold", metrics.onHold]);
  s1.addRow(["Overall Progress", `${metrics.overall}%`]);
  stripe(s1, m0, s1.rowCount);
  s1.addRow([]);

  s1.addRow(["Category", "Activities", "Completed", "Avg. Completion"]);
  styleHeader(s1, s1.rowCount);
  const c0 = s1.rowCount + 1;
  for (const stat of getCategoryStats(tasks)) {
    s1.addRow([stat.category, stat.count, stat.completed, `${stat.completion}%`]);
  }
  stripe(s1, c0, s1.rowCount);
  s1.addRow([]);

  s1.addRow(["Active Priority Activity", "Owner", "Priority", "Status", "Progress", "Target"]);
  styleHeader(s1, s1.rowCount);
  const p0 = s1.rowCount + 1;
  for (const task of getPriorityActivities(tasks)) {
    s1.addRow([
      task.title,
      task.assignee,
      task.priority,
      task.status,
      `${task.progress}%`,
      task.targetDate,
    ]);
  }
  stripe(s1, p0, s1.rowCount);
  s1.addRow([]);

  s1.addRow(["Blocker / On Hold", "Owner", "Situation & Next Step"]);
  styleHeader(s1, s1.rowCount);
  const b0 = s1.rowCount + 1;
  for (const task of getBlockers(tasks)) {
    s1.addRow([task.title, task.assignee, task.remarks]);
  }
  stripe(s1, b0, s1.rowCount);
  autoWidth(s1);

  /* ---------------- Sheet 2: Detailed IT Tracker ---------------- */
  const s2 = wb.addWorksheet("Detailed IT Tracker");
  const headers2 = [
    "ID",
    "Activity",
    "Category",
    "Sprint",
    "Assigned To",
    "Priority",
    "Status",
    "Progress",
    "Date Started",
    "Target Completion",
    "Last Updated",
    "Completed On",
    "Remarks / Blockers",
  ];
  s2.addRow(headers2);
  styleHeader(s2, 1);
  const rows2: Row[] = tasks.map((t) => [
    activityDisplayId(t),
    t.title,
    t.category,
    sprintName(t.sprintId),
    t.assignee,
    t.priority,
    t.status,
    `${t.progress}%`,
    t.dateStarted,
    t.targetDate,
    t.lastUpdated,
    t.completedOn ?? "",
    t.remarks,
  ]);
  rows2.forEach((r) => s2.addRow(r));
  stripe(s2, 2, s2.rowCount);
  autoWidth(s2, 55);
  s2.views = [{ state: "frozen", ySplit: 1 }];

  /* ---------------- Sheet 3: Monthly Accomplishments ---------------- */
  const s3 = wb.addWorksheet("Monthly Accomplishments");
  title(s3, "Completed Activities");
  s3.addRow([]);
  s3.addRow(["Month", "Activity", "Category", "Owner", "Completed On", "Result / Remarks"]);
  styleHeader(s3, s3.rowCount);
  const a0 = s3.rowCount + 1;
  for (const task of getCompleted(tasks)) {
    s3.addRow([
      monthLabel(completionDate(task) || task.lastUpdated),
      task.title,
      task.category,
      task.assignee,
      completionDate(task) || task.lastUpdated,
      task.remarks,
    ]);
  }
  stripe(s3, a0, s3.rowCount);
  autoWidth(s3, 55);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `IT-Work-Tracker-${todayISO()}.xlsx`);
}

export async function exportAccomplishmentsWorkbook(
  tasks: Task[],
  options: {
    from?: string | undefined;
    to?: string | undefined;
    all?: boolean | undefined;
  } = {},
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "IT Work Monitoring & Tracking System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Accomplishments");
  const titleRow = ws.addRow(["IT Accomplishments"]);
  titleRow.font = { bold: true, size: 14, color: { argb: BRAND } };
  titleRow.height = 24;
  ws.addRow([`${formatPeriodLabel(options)}  •  Generated ${new Date().toLocaleString("en-US")}`]);
  ws.addRow([]);
  ws.addRow(["Month", "Activity", "Owner", "Completed", "Result"]);
  const header = ws.getRow(ws.rowCount);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: BRAND_LIGHT } } };
  });
  header.height = 22;

  const bodyStart = ws.rowCount + 1;
  for (const task of tasks) {
    ws.addRow([
      monthLabel(completionDate(task) || task.lastUpdated),
      task.title,
      task.assignee,
      formatReportDate(completionDate(task)),
      task.remarks.trim() || "No result recorded",
    ]);
  }
  for (let i = bodyStart; i <= ws.rowCount; i++) {
    if ((i - bodyStart) % 2 === 1) {
      ws.getRow(i).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
      });
    }
    ws.getRow(i).alignment = { vertical: "top", wrapText: true };
  }
  ws.columns.forEach((col) => {
    let width = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length + 2;
      if (len > width) width = len;
    });
    col.width = Math.min(width, 55);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const slug = options.all || (!options.from && !options.to) ? "all-time" : `${options.from ?? "start"}-to-${options.to ?? "now"}`;
  downloadBlob(blob, `IT-Accomplishments-${slug}.xlsx`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
