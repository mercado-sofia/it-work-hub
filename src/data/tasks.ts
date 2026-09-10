export const CATEGORIES = [
  "Support/Ticketing",
  "Odoo Development",
  "Solarista Compass",
  "Hardware/Network/Infrastructure",
  "IT Consulting",
  "Maintenance/Operations",
] as const;

export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;

export const STATUSES = [
  "Not Started",
  "In Progress",
  "For Testing",
  "Completed",
  "On Hold",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export type Task = {
  id: string;
  title: string;
  category: Category;
  assignee: string;
  priority: Priority;
  status: Status;
  progress: number;
  dateStarted: string;
  targetDate: string;
  lastUpdated: string;
  remarks: string;
};

export const ASSIGNEES = [
  "Miguel Santos",
  "Andrea Villanueva",
  "Rafael Cruz",
  "Joy Fernandez",
  "Karl Domingo",
  "Patricia Uy",
];

const t = (
  id: string,
  title: string,
  category: Category,
  assignee: string,
  priority: Priority,
  status: Status,
  progress: number,
  dateStarted: string,
  targetDate: string,
  lastUpdated: string,
  remarks: string,
): Task => ({
  id,
  title,
  category,
  assignee,
  priority,
  status,
  progress,
  dateStarted,
  targetDate,
  lastUpdated,
  remarks,
});

export const SEED_TASKS: Task[] = [
  t("T-1001", "Helpdesk ticket backlog clean-up (Q3 carryover)", "Support/Ticketing", "Joy Fernandez", "High", "In Progress", 65, "2026-07-06", "2026-09-30", "2026-09-08", "Backlog down from 210 to 74 tickets. Remaining items are mostly printer and access requests."),
  t("T-1002", "Rollout of new IT service desk SLA policy", "Support/Ticketing", "Patricia Uy", "Medium", "For Testing", 80, "2026-06-15", "2026-09-25", "2026-09-09", "Draft SLA circulated to department heads; awaiting HR sign-off before publishing."),
  t("T-1003", "End-user onboarding kit automation", "Support/Ticketing", "Joy Fernandez", "Low", "Not Started", 0, "2026-09-15", "2026-11-14", "2026-09-01", "Scheduled after backlog clean-up. Requires HR headcount forecast."),
  t("T-1004", "Password reset self-service portal", "Support/Ticketing", "Karl Domingo", "Medium", "Completed", 100, "2026-05-04", "2026-07-31", "2026-07-29", "Live since July. Reset tickets reduced by 38% month-on-month."),

  t("T-2001", "Odoo 17 upgrade — Sales & CRM modules", "Odoo Development", "Miguel Santos", "Critical", "In Progress", 55, "2026-06-01", "2026-10-15", "2026-09-09", "Custom pricing rules migrated. Two report templates still failing regression."),
  t("T-2002", "Inventory reorder-point automation", "Odoo Development", "Andrea Villanueva", "High", "For Testing", 85, "2026-07-13", "2026-09-20", "2026-09-07", "UAT with Warehouse team ongoing; 3 minor defects logged."),
  t("T-2003", "Payroll integration with accounting journals", "Odoo Development", "Miguel Santos", "High", "On Hold", 30, "2026-05-18", "2026-10-30", "2026-08-21", "Blocked: Finance has not finalised the chart of accounts mapping. Next step — mapping workshop with Controller."),
  t("T-2004", "Purchase approval workflow revamp", "Odoo Development", "Andrea Villanueva", "Medium", "Completed", 100, "2026-04-06", "2026-06-30", "2026-06-27", "Deployed; approval turnaround improved from 3 days to under 8 hours."),
  t("T-2005", "Customer portal invoice download fix", "Odoo Development", "Rafael Cruz", "Low", "Completed", 100, "2026-08-03", "2026-08-21", "2026-08-19", "Patched PDF renderer; verified across 40 customer accounts."),

  t("T-3001", "Solarista Compass — project costing dashboard", "Solarista Compass", "Rafael Cruz", "Critical", "In Progress", 45, "2026-07-01", "2026-11-30", "2026-09-08", "Data model complete; charting layer in development. Dependent on finance data feed."),
  t("T-3002", "Compass mobile field-survey module", "Solarista Compass", "Patricia Uy", "High", "In Progress", 35, "2026-08-10", "2026-12-15", "2026-09-05", "Offline capture prototype working. Photo sync needs storage sizing."),
  t("T-3003", "Compass user access matrix & role clean-up", "Solarista Compass", "Karl Domingo", "Medium", "For Testing", 75, "2026-07-20", "2026-09-30", "2026-09-06", "Roles rebuilt; pending validation from Operations leads."),
  t("T-3004", "Compass v1.4 release — quotation templates", "Solarista Compass", "Rafael Cruz", "High", "Completed", 100, "2026-05-12", "2026-07-15", "2026-07-11", "Released on time. Adopted by 100% of the sales engineering team."),

  t("T-4001", "Head office network switch replacement", "Hardware/Network/Infrastructure", "Karl Domingo", "Critical", "In Progress", 60, "2026-08-01", "2026-09-26", "2026-09-09", "Core switches installed. Access-layer cutover scheduled for the weekend window."),
  t("T-4002", "Branch site failover internet link", "Hardware/Network/Infrastructure", "Karl Domingo", "High", "On Hold", 20, "2026-06-22", "2026-10-31", "2026-08-14", "Blocked: ISP has not delivered the secondary line. Next step — escalate to account manager with penalty clause."),
  t("T-4003", "Laptop refresh programme (25 units)", "Hardware/Network/Infrastructure", "Joy Fernandez", "Medium", "In Progress", 50, "2026-07-05", "2026-10-10", "2026-09-04", "12 of 25 units deployed and imaged; remaining units awaiting delivery."),
  t("T-4004", "Server room UPS capacity upgrade", "Hardware/Network/Infrastructure", "Miguel Santos", "High", "Not Started", 0, "2026-10-01", "2026-12-19", "2026-09-02", "Vendor quotations being compared; capex approval requested."),
  t("T-4005", "Office Wi-Fi coverage remediation", "Hardware/Network/Infrastructure", "Karl Domingo", "Medium", "Completed", 100, "2026-04-20", "2026-06-14", "2026-06-12", "Six access points added; dead zones on 3rd floor eliminated."),

  t("T-5001", "IT governance & policy framework advisory", "IT Consulting", "Patricia Uy", "Medium", "In Progress", 40, "2026-06-08", "2026-11-28", "2026-09-03", "Policy gap assessment complete; drafting acceptable-use and data-retention policies."),
  t("T-5002", "Digital transformation roadmap 2027", "IT Consulting", "Miguel Santos", "High", "In Progress", 30, "2026-08-17", "2026-12-12", "2026-09-08", "Departmental interviews 60% done. Roadmap presentation targeted for December ExCom."),
  t("T-5003", "Vendor consolidation assessment", "IT Consulting", "Andrea Villanueva", "Low", "Not Started", 0, "2026-10-05", "2026-12-31", "2026-09-01", "Awaiting procurement spend data."),
  t("T-5004", "Cybersecurity awareness training programme", "IT Consulting", "Patricia Uy", "High", "Completed", 100, "2026-03-02", "2026-05-29", "2026-05-27", "94% employee completion rate; phishing click-rate dropped to 4%."),

  t("T-6001", "Monthly server patching & backup verification", "Maintenance/Operations", "Rafael Cruz", "High", "In Progress", 70, "2026-01-05", "2026-12-31", "2026-09-09", "August cycle complete and verified. September window starts on the 20th."),
  t("T-6002", "Disaster recovery drill (semi-annual)", "Maintenance/Operations", "Miguel Santos", "Critical", "For Testing", 60, "2026-08-24", "2026-09-28", "2026-09-07", "Failover runbook rehearsed; full restore test pending business sign-off."),
  t("T-6003", "License renewal & asset inventory audit", "Maintenance/Operations", "Andrea Villanueva", "Medium", "On Hold", 25, "2026-07-11", "2026-10-24", "2026-08-29", "Blocked: awaiting finance confirmation of renewal budget. Next step — budget review meeting."),
  t("T-6004", "Email security gateway tuning", "Maintenance/Operations", "Karl Domingo", "Medium", "Completed", 100, "2026-06-01", "2026-07-24", "2026-07-22", "False positives reduced by 61%; quarantine review process documented."),
  t("T-6005", "Quarterly access rights review (Q2)", "Maintenance/Operations", "Patricia Uy", "Low", "Completed", 100, "2026-06-15", "2026-07-10", "2026-07-08", "All dormant accounts disabled; report filed with Internal Audit."),
];
