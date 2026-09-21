# TrackHub

Internal IT work hub for the department: a public request portal for the rest of the company, and a signed-in workspace for tracking activities, sprints, and completed work.

---

## What it is

TrackHub has two sides:

- **Public intake** — anyone in the company can submit a bug, feature, access, or support request and look up status with their ticket number and email. No IT account required.
- **IT workspace** — signed-in staff and leadership see the executive dashboard, master tracker, incoming tickets, and monthly reports.

Incoming tickets can be triaged, assigned, and converted into tracker activities. Activity data lives in the browser on this device. Requests, team accounts, and settings use Lovable Cloud (Supabase) when it is configured, or a local file store during development.

---

## Who it is for

| Role | Access |
| --- | --- |
| **Requesters** | Public form and status lookup only |
| **IT Admin** | Full editing, team invites, and department settings |
| **IT Staff** | Full editing of tracker and requests |
| **Management** | Read-only dashboard, tracker, requests, and reports |

The first person to open `/login` creates the IT Admin account. After that, only an admin can invite staff or management users from Settings.

---

## What you track

Each **activity** includes title, category, owner, priority, status, progress (0–100%), dates, remarks/blockers, and an optional sprint. Activities created from a ticket keep a request reference.

**Activity status:** Not Started · In Progress · For Testing · Completed · On Hold

**Priority:** Critical · High · Medium · Low

**Default categories / modules:** Odoo Development · Solarista Compass · Hardware/Network · IT Consulting · Maintenance/Operations

You can add categories and staff names as the team grows.

---

## Reports and backup

Use **Export** in the header:

- **Excel** — management summary, full tracker, and monthly reports
- **PDF** — a short IT status brief for leadership

Use **Backup** to download or restore a JSON copy of tracker data, import older browser data, or load sample activities.

Tracker data is stored in this browser. Download Excel or JSON periodically if you need a copy you can restore later.

---

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions)
- Vite, TypeScript, Tailwind CSS 4, shadcn/ui
- TanStack Query, Zod
- ExcelJS and jsPDF for client-side exports
- Optional [Lovable Cloud / Supabase](https://lovable.dev) for shared request and account data

---

## Author

**Sofia Mercado**  

[LinkedIn](https://www.linkedin.com/in/sofialyn/) | [GitHub](https://github.com/mercado-sofia) | [sofia1809.mercado@gmail.com](mailto:sofia1809.mercado@gmail.com)
