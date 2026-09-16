import type { Task } from "@/data/tasks";
import { displayRequestType } from "@/data/requests";
import {
  getBlockers,
  getCategoryStats,
  getCompleted,
  getMetrics,
  getPeriodSnapshot,
  getPriorityActivities,
  groupByMonth,
  formatDate,
  formatPeriodLabel,
  formatReportDate,
} from "@/lib/metrics";
import { completionDate, todayISO } from "@/lib/task-rules";

const BRAND: [number, number, number] = [29, 78, 216];
const SLATE: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [239, 244, 252];

export async function exportExecutivePdf(tasks: Task[], departmentName?: string) {
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
    `${departmentName?.trim() || "Information Technology Department"}  •  Generated ${new Date().toLocaleString("en-US")}`,
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

  doc.save(`IT-Executive-Brief-${todayISO()}.pdf`);
}

export async function exportAccomplishmentsPdf(
  tasks: Task[],
  options: {
    from?: string | undefined;
    to?: string | undefined;
    all?: boolean | undefined;
    departmentName?: string | undefined;
  } = {},
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const snapshot = getPeriodSnapshot(tasks);
  const period = formatPeriodLabel(options);
  const department = options.departmentName?.trim() || "Information Technology Department";

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 74, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("IT Accomplishments", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`${department}  •  ${period}  •  Generated ${new Date().toLocaleString("en-US")}`, margin, 52);

  const tiles = [
    ["Completions", String(snapshot.count)],
    ["Categories", String(snapshot.categoryCount)],
    ["Owners", String(snapshot.ownerCount)],
  ];
  const gap = 12;
  const tileW = (pageW - margin * 2 - gap * 2) / 3;
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

  const tableTheme = {
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9, halign: "left" as const },
    bodyStyles: { fontSize: 8.5, textColor: [40, 48, 62] as [number, number, number] },
    alternateRowStyles: { fillColor: LIGHT },
    styles: { cellPadding: 5, lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.4 },
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: 175 }, 3: { cellWidth: 165 } },
  };

  let startY = y + 78;
  const groups = groupByMonth(tasks);
  if (groups.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text("No completed tracker activities in this window.", margin, startY);
  } else {
    for (const group of groups) {
      autoTable(doc, {
        ...tableTheme,
        startY,
        head: [[`${group.month}  ·  ${group.items.length} completed`, "Owner", "Completed", "Result"]],
        body: group.items.map((task) => [
          task.title,
          task.assignee,
          formatReportDate(completionDate(task)),
          task.remarks.trim() || "No result recorded",
        ]),
      });
      startY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
      startY += 20;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(`IT Accomplishments — ${period} — Page ${i} of ${pages}`, margin, doc.internal.pageSize.getHeight() - 20);
  }

  const slug = options.all || (!options.from && !options.to) ? "all-time" : `${options.from ?? "start"}-to-${options.to ?? "now"}`;
  doc.save(`IT-Accomplishments-${slug}.pdf`);
}

type CompletionPayload = {
  request: {
    ticket: string;
    title: string;
    type: string;
    department: string;
    requesterName: string;
    note: string;
    resolutionNotes: string;
    createdAt: string;
    acceptedAt: string | null;
    resolvedAt: string | null;
    history: Array<{
      fromStatus: string | null;
      toStatus: string;
      createdAt: string;
      actorName: string;
      reason: string | null;
    }>;
  };
  settings: {
    departmentName: string;
    contactEmail: string;
    contactExtension: string;
    signatoryName: string;
  };
  preparedBy: string;
};

function turnaround(from: string, to: string | null) {
  if (!to) return "—";
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";
  const days = Math.round((end - start) / (24 * 60 * 60 * 1000));
  return days === 1 ? "1 day" : `${days} days`;
}

export async function exportRequestCompletionPdf(payload: CompletionPayload) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { request, settings, preparedBy } = payload;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const followUp = `${origin}/request`;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 74, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("IT Request Completion Report", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`${request.ticket}  •  Generated ${new Date().toLocaleString("en-US")}`, margin, 52);

  let y = 100;
  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(request.title, margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE);
  doc.text(
    `${request.ticket}  •  ${displayRequestType(request.type)}  •  ${request.department}  •  ${request.requesterName}`,
    margin,
    y,
  );

  autoTable(doc, {
    startY: y + 16,
    head: [["Submitted", "Accepted", "Resolved", "Turnaround"]],
    body: [
      [
        formatDate(request.createdAt.slice(0, 10)),
        request.acceptedAt ? formatDate(request.acceptedAt.slice(0, 10)) : "—",
        request.resolvedAt ? formatDate(request.resolvedAt.slice(0, 10)) : "—",
        turnaround(request.createdAt, request.resolvedAt),
      ],
    ],
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 48, 62] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 22;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND);
  doc.setFontSize(10);
  doc.text("What was requested", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 48, 62);
  doc.setFontSize(9.5);
  const requested = doc.splitTextToSize(request.note || "—", pageW - margin * 2);
  doc.text(requested, margin, y);
  y += requested.length * 12 + 12;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND);
  doc.text("IT resolution notes", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 48, 62);
  const notes = doc.splitTextToSize(request.resolutionNotes || "—", pageW - margin * 2);
  doc.text(notes, margin, y);

  autoTable(doc, {
    startY: y + notes.length * 12 + 16,
    head: [["From", "To", "Date", "By"]],
    body: request.history.map((row) => [
      row.fromStatus ?? "—",
      row.toStatus,
      formatDate(row.createdAt.slice(0, 10)),
      row.actorName,
    ]),
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [40, 48, 62] },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 22;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, pageW - margin * 2, 70, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND);
  doc.setFontSize(9);
  doc.text("Follow-up", margin + 12, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 48, 62);
  doc.setFontSize(8.5);
  doc.text(
    doc.splitTextToSize(
      `To raise a follow-up, submit a new request at ${followUp}. If there is no reply, this ticket closes automatically.`,
      pageW - margin * 2 - 24,
    ),
    margin + 12,
    y + 34,
  );

  y += 90;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND);
  doc.setFontSize(10);
  doc.text(settings.departmentName || "Information Technology Department", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  const contact = [
    settings.contactEmail && `Email: ${settings.contactEmail}`,
    settings.contactExtension && `Ext: ${settings.contactExtension}`,
  ]
    .filter(Boolean)
    .join("  •  ");
  if (contact) {
    doc.text(contact, margin, y);
    y += 14;
  }
  doc.setTextColor(40, 48, 62);
  doc.text(`Prepared by: ${preparedBy || settings.signatoryName || "—"}`, margin, y);
  y += 28;
  doc.text("Signature: ______________________________", margin, y);

  doc.save(`${request.ticket}-completion-report.pdf`);
}
