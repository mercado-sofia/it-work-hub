# IT Work Hub

Copy and paste this complete, unified prompt directly into Lovable to build the full application from scratch:

"Build a modern, corporate IT Work Monitoring and Tracking System with built-in export capabilities for leadership status reporting.

1. Data Structure & State

Implement a task/activity data model containing:

Task Name / Activity Title



Category (Support/Ticketing, Odoo Development, Solarista Compass, Hardware/Network/Infrastructure, IT Consulting, Maintenance/Operations)

Assigned To (IT Staff Name)

Priority (Critical, High, Medium, Low)

Status (Not Started, In Progress, For Testing, Completed, On Hold)

Progress Percentage (0–100% slider or input)

Date Started



Target Completion Date



Last Updated Date (auto-updates or manual)

Remarks / Current Situation / Blockers



Pre-populate the app with realistic sample data across all categories and statuses.

2. Views & Navigation

Executive Management Dashboard:

KPI Summary Cards: Total Activities, Completed, In Progress, and Pending / On Hold.

Overall Progress Bar: Visual aggregate completion rate for all active work.

Work by Category: Visual breakdown showing task counts and completion rate per category (Support, Odoo, Solarista, Network, Maintenance).

Current Priority Activities: Clean table showing ongoing high-priority tasks with assigned staff, progress bars, target dates, and status badges.

Blockers & On-Hold Callout: Dedicated alert card listing stalled items, root causes, and required next steps.

Master Task Tracker:

Toggle between Table View and Kanban Board (grouped by Status).

Search bar and multi-select filters for Category, Status, Priority, and Assignee.

Inline editing, status updating, and an 'Add New Activity' modal form.

Accomplishments & Reports View:

Filterable log of 'Completed' tasks grouped by month or date range to serve as executive accomplishment reports.

3. Export & Handout Engine (XLSX & PDF)

Add an 'Export & Reports' dropdown button at the top header containing:

Export to Excel (.xlsx):

Use a client-side Excel library (e.g., xlsx or exceljs).

Generate a multi-sheet formatted workbook:

Sheet 1: 'Management Summary' — Summary metrics, category counts, active priorities, and blocker notes.

Sheet 2: 'Detailed IT Tracker' — Full list of all activities with headers, dates, status badges, and remarks.

Sheet 3: 'Monthly Accomplishments' — Log of completed tasks.

Include professional formatting: navy blue headers with bold white text, alternating row shading, and auto-adjusted column widths.

Executive PDF Handout:

Use a printable/PDF engine (e.g., jspdf, html2pdf.js, or browser print stylesheet).

Generate a clean, corporate 1-to-2 page 'IT Status & Accomplishment Brief' suitable for executive leadership.

Include document title, generated timestamp, KPI overview tiles, the department progress bar, top active projects, and highlighted accomplishments.

4. UI & Styling

Professional enterprise aesthetic using a clean navy/slate and neutral color palette with clean badges for priorities and statuses.

Include a toggle preview for 'Management Mode' (Read-Only Executive View) vs. 'IT Editor Mode'.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d7f34061-0595-46b0-b42b-5208f7fadcd7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
