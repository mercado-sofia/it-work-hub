import type { Task } from "@/data/tasks";
import {
  getBlockers,
  getCategoryStats,
  getCompleted,
  getMetrics,
  getPriorityActivities,
  formatDate,
} from "@/lib/metrics";
import { completionDate } from "@/lib/task-rules";

const BRAND: [number, number, number] = [59, 107, 255];
const SLATE: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [244, 247, 254];

export async function exportExecutivePdf(tasks: Task[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const metrics = getMetrics(tasks);

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 74, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("IT Status & Accomplishment Brief", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    `Information Technology Department  •  Generated ${new Date().toLocaleString("en-US")}`,
    margin,
    52,
  );

  // KPI tiles — project work only
  const tiles = [
    ["Activities", String(metrics.total)],
    ["Completed", String(metrics.completed)],
    ["In Progress", String(metrics.inProgress)],
    ["On Hold", String(metrics.onHold)],
  ];
  const gap = 12;
  const tileW = (pageW - margin * 2 - gap * 3) / 4;
  let y = 96;
  tiles.forEach((tile, i) => {
    const [label, value] = tile;
    const x = margin + i * (tileW + gap);
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(214, 222, 232);
    doc.roundedRect(x, y, tileW, 56, 4, 4, "FD");
    doc.setTextColor(...SLATE);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text((label ?? "").toUpperCase(), x + 10, y + 18);
    doc.setTextColor(...BRAND);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(value ?? "", x + 10, y + 44);
  });

  y += 78;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text("Overall Progress", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${metrics.overall}%`, pageW - margin - 26, y);
  const barW = pageW - margin * 2;
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(margin, y + 8, barW, 10, 5, 5, "F");
  doc.setFillColor(...BRAND);
  doc.roundedRect(margin, y + 8, Math.max(6, (barW * metrics.overall) / 100), 10, 5, 5, "F");

  const tableTheme = {
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9, halign: "left" as const },
    bodyStyles: { fontSize: 8.5, textColor: [40, 48, 62] as [number, number, number] },
    alternateRowStyles: { fillColor: LIGHT },
    styles: { cellPadding: 5, lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.4 },
    margin: { left: margin, right: margin },
  };

  autoTable(doc, {
    ...tableTheme,
    startY: y + 34,
    head: [["Work by Category", "Activities", "Completed", "Avg. Completion"]],
    body: getCategoryStats(tasks).map((s) => [
      s.category,
      String(s.count),
      String(s.completed),
      `${s.completion}%`,
    ]),
  });

  autoTable(doc, {
    ...tableTheme,
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["Top Active Projects", "Owner", "Priority", "Status", "Progress", "Target"]],
    body: getPriorityActivities(tasks)
      .slice(0, 8)
      .map((t) => [
        t.title,
        t.assignee,
        t.priority,
        t.status,
        `${t.progress}%`,
        formatDate(t.targetDate),
      ]),
    columnStyles: { 0: { cellWidth: 175 } },
  });

  autoTable(doc, {
    ...tableTheme,
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["Key Project Accomplishments", "Owner", "Completed", "Result"]],
    body: getCompleted(tasks)
      .slice(0, 6)
      .map((t) => [t.title, t.assignee, formatDate(completionDate(t) || t.lastUpdated), t.remarks]),
    columnStyles: { 0: { cellWidth: 150 }, 3: { cellWidth: 165 } },
  });

  const blockers = getBlockers(tasks);
  if (blockers.length) {
    autoTable(doc, {
      ...tableTheme,
      headStyles: { ...tableTheme.headStyles, fillColor: [153, 27, 27] },
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["Blockers Requiring Management Support", "Owner", "Situation & Next Step"]],
      body: blockers.map((t) => [t.title, t.assignee, t.remarks]),
      columnStyles: { 0: { cellWidth: 150 }, 2: { cellWidth: 215 } },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(
      `IT Status & Accomplishment Brief — Page ${i} of ${pages}`,
      margin,
      doc.internal.pageSize.getHeight() - 20,
    );
  }

  doc.save(`IT-Executive-Brief-${new Date().toISOString().slice(0, 10)}.pdf`);
}
