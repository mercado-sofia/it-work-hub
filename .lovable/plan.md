# IT Work Monitoring & Tracking System

A corporate-styled internal tool for tracking IT activities, with an executive dashboard, a full task tracker, an accomplishments log, and Excel/PDF exports for leadership.

## Assumption
Data lives in the browser (sample data pre-loaded, edits saved locally). No accounts or shared database yet — say the word and I'll add Lovable Cloud so the whole team sees the same data.

## Pages

**Dashboard (home)**
- Four summary cards: Total Activities, Completed, In Progress, Pending/On Hold
- Overall department progress bar
- Work by category: counts and completion rate for Support/Ticketing, Odoo Development, Solarista Compass, Hardware/Network/Infrastructure, IT Consulting, Maintenance/Operations
- Current priority activities table: staff, progress bar, target date, status badge
- Blockers & On-Hold alert card: stalled items, cause, next step

**Tracker**
- Toggle between table view and a Kanban board grouped by status
- Search plus multi-select filters for category, status, priority, assignee
- Inline edits to status and progress, plus an "Add New Activity" modal
- Fields per activity: title, category, assignee, priority, status, progress %, date started, target completion, last updated (auto-set on edit), remarks/blockers

**Accomplishments**
- Completed tasks grouped by month, with a date-range filter, ready to read out as a report

## Export & Reports
Header dropdown on every page:
- **Excel (.xlsx)** — three sheets: Management Summary, Detailed IT Tracker, Monthly Accomplishments. Navy headers with bold white text, alternating row shading, sized columns.
- **Executive PDF brief** — 1–2 clean pages: title, generated timestamp, KPI tiles, department progress bar, top active projects, highlighted accomplishments.

## Modes
A header switch between Management Mode (read-only executive view: no editing controls, no add button) and IT Editor Mode (full editing).

## Look
Navy and slate on neutral backgrounds, enterprise-clean. Color-coded badges for priority and status, subtle card borders, no decorative flourishes.

## Technical notes
- Routes: `/` (dashboard), `/tracker`, `/accomplishments`; shared header with nav, mode toggle, and export dropdown in `__root`.
- Types and sample seed data in `src/data/tasks.ts` (~24 activities spanning every category, status, and priority).
- State via a React context store with localStorage persistence; `lastUpdated` stamped on every mutation.
- Design tokens (navy/slate palette, badge variants) defined in `src/styles.css`; shadcn components for table, dialog, select, slider, tabs, dropdown.
- Exports: `exceljs` for the workbook, `jspdf` + `jspdf-autotable` for the PDF, both client-side.
- Per-route `head()` metadata with unique titles and descriptions.
