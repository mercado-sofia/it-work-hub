# IT Request Portal (Intake Module)

A public request form for other departments, plus a Requests tab inside the existing IT monitoring app for triage and conversion into tracker activities.

## Answering the main question: one system, two doorways

There is no second portal to maintain. Same app, two entrances:

```text
/request              -> submit a request (anyone, no login)
/request/status       -> look up my request by ticket number + email
/requests  (IT tab)   -> triage list, next to Dashboard / Tracker / Accomplishments
```

Requesters never see the board. IT sees requests as one more tab in the tool they already use.

## What has to change underneath

Today everything lives in each person's own browser, so a request typed by HR would never reach IT. Requests therefore move to shared cloud storage (built-in, no external account). No logins for anyone:

- Requester identifies themselves with name, email and department on the form.
- The IT Requests tab is only reachable from the app's navigation and is protected by the existing IT Editor / Management mode switch — Management mode is read-only.
- The existing tracker stays exactly as it is, in the browser. Nothing about tasks, kanban or sprints changes.

Trade-off to be aware of: because the tracker is still browser-local, the link between a request and its task is recorded on the request, and the task itself is created in the IT machine that did the conversion. If you later want the tracker shared across the team too, that is a separate follow-up.

## 1. Submission form (`/request`)

Fields: type (Bug / Feature Request / Enhancement / Access Request / Question), title, description, affected module, requester name, email, department (HR, Supply Chain & Logistics, Finance, IT), your urgency (Low/Medium/High), attachments (multiple screenshots/files).
Bug type additionally shows and requires: steps to reproduce, expected behavior, actual behavior.

On submit:
- Duplicate check first: matches title/module keywords against open requests, shows "this looks similar — continue anyway?" with links.
- Generates a ticket number `REQ-2026-0042`, sets status Submitted, shows a confirmation screen with the ticket number and a copy button.

## 2. Status lookup (`/request/status`)

Ticket number + email returns the request: current status, full status history with dates, decline reason if declined, and the comment thread. The requester can reply in the thread.

## 3. IT Requests tab (`/requests`)

Same table style as the tracker: ticket, title, type, department, submitted date, requester urgency, IT priority, status. Sortable and filterable by priority (default, descending), department, module, type and status.

Opening a request shows full detail, attachments, history and comments. Actions: set IT priority, change status, comment, **Accept & convert to task** (creates a tracker activity pre-filled with title, description and module, links it back, sets status Accepted), and **Decline** (reason required).

Converted tasks get an "Originated from REQ-…" badge in the tracker, and moving that task to In Progress / For Testing / Completed updates the linked request automatically (Completed sets Resolved and stamps the resolve date).

## 4. Completion report (your suggestion — included)

Once a request reaches Resolved or Closed, IT gets a **Download completion report (PDF)** button on the request. One clean page containing:

- Ticket number, title, type, department, requester name
- Dates: submitted, accepted, resolved, and total turnaround
- What was requested, and IT's resolution notes
- Status history table
- A closing note telling the requester how to raise a follow-up (link to `/request`) and that the ticket closes automatically if there's no reply
- IT department block: department name, contact email/extension, prepared-by name and a signature line

IT downloads it and sends it through whatever channel they already use. A matching "Resolution notes" field is added to the request detail so the report has real content.

## Status lifecycle

Submitted → Under Review → Accepted → In Progress → Testing → Resolved → Closed, with Declined as a terminal branch requiring a reason. Every change writes a history row through a single status-change function, so email or push notifications can be added later without rework.

## Technical notes

- Enable Lovable Cloud. New tables: `departments` (seeded HR, Supply Chain & Logistics, Finance, IT), `modules`, `requests`, `request_comments`, `request_status_history`; storage bucket for attachments.
- No auth: writes go through server functions that validate input with Zod and control exactly what is written; reads of a single request require ticket number + matching email, so no one can browse others' requests. RLS stays on with no direct anon table access.
- `requests.linked_task_id` stores the local tracker task id; the tracker store gains a `requestRef` field and calls a mapping function on status change to push the request status back through a server function.
- New routes: `request.tsx`, `request.status.tsx`, `requests.tsx`, `requests.$ticket.tsx`, each with its own `head()` metadata; `/request*` renders a slim public shell without the IT navigation.
- Completion report reuses the existing `jspdf` setup in `src/lib/export-pdf.ts` patterns.
- IT contact details and signatory for the report are configurable in a small settings panel, so nothing is invented in code.
