# TrackHub

Internal IT work hub for the department: a public request portal for the rest of the company, and a signed-in workspace for tracking activities, sprints, and completed work.

---

## What it is

TrackHub has two sides:

- **Public intake** — anyone in the company can submit a bug, feature, access, or support request and look up status with their ticket number and email. No IT account required.
- **IT workspace** — signed-in staff and leadership see the executive dashboard, master tracker, incoming tickets, and monthly accomplishments.

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

## Pages

### Public

| Route | Purpose |
| --- | --- |
| `/request` | Submit a request. Types: Bug, Feature Request, Enhancement, Access Request, Question. Similar open tickets are flagged before submit. |
| `/request/status` | Look up a ticket by number and requester email. Requesters can add comments while the ticket is still open. |

Tickets are numbered `R-NNNN` (for example `R-0001`). Attachments: up to 5 files, 4 MB each (images, PDF, text, Word, Excel).

### IT workspace (sign-in required)

#### Dashboard (`/`)

A snapshot of department work:

- Counts for activities, completed, in progress, and on hold
- Overall completion
- Work by category
- Current priority projects
- Overdue items and blockers

#### Master Tracker (`/tracker`)

The full activity list. Search and filter by category, status, priority, assignee, or sprint. Three views:

- **Table** — spreadsheet-style list for scanning and editing
- **Kanban** — columns by status
- **Sprint** — planned, active, and completed sprints, with work assigned to each

Staff can add, edit, or remove activities. Management accounts are read-only.

#### Requests (`/requests`)

Inbox for department tickets. Filter by priority, department, module, type, and status. Open a ticket to:

- Set IT priority and assignee
- Move it through the workflow
- Leave public or internal comments
- Convert accepted work into a tracker activity
- Download a completion report (PDF) after it is resolved

**Request status:** Submitted → Under Review → Accepted → In Progress → Testing → Resolved → Closed (or Declined)

#### Accomplishments (`/accomplishments`)

Completed tracker work grouped by month. Filter by date range for a leadership reporting window.

#### Settings (`/settings`, admin only)

Department contact block (used on completion reports) and IT team management: invite users, change roles, deactivate accounts.

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

- **Excel** — management summary, full tracker, and monthly accomplishments
- **PDF** — a short IT status and accomplishment brief for leadership

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

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL Vite prints.

1. Go to `/login` and create the first IT Admin.
2. Invite the rest of the team from Settings.
3. Share `/request` with other departments.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

### Environment

Copy `.env.example` to `.env`. Leave the Supabase variables empty to use the local `.data` store while developing.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Lovable Cloud project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side access to requests, accounts, and attachments |
| `VITE_SUPABASE_ANON_KEY` | Client Supabase key (when Cloud is enabled) |
| `SESSION_SECRET` | Cookie session password (32+ characters). Generated into `.data/session-secret` if unset. |

Apply `supabase/migrations/20260914120000_it_request_portal.sql` on the Cloud project before enabling those variables. Row Level Security is on; the app talks to the database through the service role on the server.

`.env` and `.data/` are gitignored. Do not commit secrets or the local intake store.

---

## Data model

- **Tracker** (activities, sprints, staff, categories) — `localStorage` on the signed-in device
- **Intake** (requests, comments, history, attachments, IT profiles, settings) — Supabase when Cloud env vars are set, otherwise `.data/intake-store.json`

When a linked tracker activity moves to In Progress, For Testing, or Completed, the matching request status is updated to stay in sync.

---

Continue building this project in [Lovable](https://lovable.dev/projects/d7f34061-0595-46b0-b42b-5208f7fadcd7).

---

## Author

**Sofia Mercado**  

[LinkedIn](https://www.linkedin.com/in/sofialyn/) | [GitHub](https://github.com/mercado-sofia) | [sofia1809.mercado@gmail.com](mailto:sofia1809.mercado@gmail.com)
