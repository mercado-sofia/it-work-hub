import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  CircleHelp,
  ClipboardList,
  Moon,
  Shield,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { LoginPanel } from "@/components/LoginPanel";
import { RequestForm } from "@/components/RequestForm";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAuthBootstrap } from "@/lib/request-functions";
import { LandingSkeleton } from "@/components/skeletons";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type LandingSearch = { view?: "request" | "login" };
type BootstrapView = "start" | "request" | "login";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LandingSearch => {
    const view = search["view"];
    if (view === "request" || view === "login") return { view };
    return {};
  },
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: "/dashboard" });
  },
  loader: async () => {
    try {
      return await getAuthBootstrap();
    } catch {
      return { needsBootstrap: false };
    }
  },
  pendingComponent: LandingSkeleton,
  head: ({ match }) => {
    const view = match.search.view;
    if (view === "login") {
      return {
        meta: [
          { title: "IT Sign in | TrackHub" },
          { name: "description", content: "Sign in to the IT work monitoring system." },
        ],
      };
    }
    if (view === "request") {
      return {
        meta: [
          { title: "Submit an IT Request" },
          {
            name: "description",
            content: "Send a bug, feature, access, or support request to the IT department.",
          },
        ],
      };
    }
    return {
      meta: [
        { title: "IT Request Portal | TrackHub" },
        {
          name: "description",
          content: "Submit an IT request, or sign in if you are part of the IT department.",
        },
      ],
    };
  },
  component: LandingPage,
});

function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { view } = Route.useSearch();
  const current: BootstrapView = view ?? "start";
  const { needsBootstrap } = Route.useLoaderData();

  return (
    <div className="relative h-svh overflow-hidden bg-white font-sans text-foreground dark:bg-background">
      <header className="absolute inset-x-0 top-0 z-40 border-b border-border/70 bg-white print:hidden dark:bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
          {current !== "start" && <BackButton />}
          <Link to="/" search={{}} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img src="/it-logo.png" alt="" className="size-9 rounded-full object-cover" />
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold tracking-tight">TrackHub</p>
              <p className="hidden text-xs text-muted-foreground sm:block">IT Department</p>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {current === "request" && (
              <Link
                to="/request/status"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Check status
              </Link>
            )}
            <HelpDialog />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full px-2.5"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="h-full">
        <div className="bootstrap-stage">
          <section
            className={cn("bootstrap-panel flex flex-col justify-center px-4 py-4 sm:px-6", panelClass("start", current))}
            aria-hidden={current !== "start"}
            inert={current !== "start"}
          >
            <StartChooser />
          </section>
          <section
            className={cn("bootstrap-panel", panelClass("request", current))}
            aria-hidden={current !== "request"}
            inert={current !== "request"}
          >
            <RequestForm />
          </section>
          <section
            className={cn("bootstrap-panel", panelClass("login", current))}
            aria-hidden={current !== "login"}
            inert={current !== "login"}
          >
            <LoginPanel needsBootstrap={needsBootstrap} />
          </section>
        </div>
      </main>
    </div>
  );
}

function panelClass(id: BootstrapView, current: BootstrapView) {
  if (id === current) return "is-active";
  if (id === "request") return "is-park-left";
  if (id === "login") return "is-park-right";
  return current === "request" ? "is-park-right" : "is-park-left";
}

function StartChooser() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="text-center">
        <div className="relative mx-auto flex max-w-lg items-center justify-center">
          <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-border" />
          <p className="relative inline-flex rounded-full border border-border bg-white px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:bg-background">
            How it works
          </p>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          Get started in <span className="text-primary">2 simple steps</span>
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Submit a request if you need IT help, or sign in if you are part of the IT department.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="relative">
          <p className="mb-1.5 flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground sm:justify-start">
            Submit a request
            <ArrowDownRight className="size-3.5 shrink-0" strokeWidth={1.75} />
          </p>
          <ChoiceCard
            view="request"
            title="I need to submit a request"
            description="No account needed. Send a bug, access, or support request and get a ticket number to track status."
            cta="Open request form"
          >
            <RequestPreview />
          </ChoiceCard>
        </div>

        <div className="relative">
          <p className="mb-1.5 flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground sm:justify-end">
            <ArrowDownLeft className="size-3.5 shrink-0" strokeWidth={1.75} />
            IT Department
          </p>
          <ChoiceCard
            view="login"
            title="I am part of the IT department"
            description="Sign in to triage incoming tickets, update the tracker, and work from the IT dashboard."
            cta="Continue to sign in"
          >
            <ItPreview />
          </ChoiceCard>
        </div>
      </div>
    </div>
  );
}

function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="rounded-full px-2.5 sm:px-3">
          <CircleHelp className="size-4" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[38rem] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 bg-muted/40 px-6 py-5 pr-14 text-left sm:px-8 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CircleHelp className="size-5" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <DialogTitle>How to use TrackHub</DialogTitle>
              <DialogDescription className="text-[13px] leading-snug sm:text-[13px]">
                Select how you want to continue. Requests do not require an account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-7">
          <HelpPathCard
            eyebrow="For everyone"
            title="Submit a request"
            icon={<ClipboardList className="size-5" />}
            steps={[
              "Open the form and describe the issue.",
              "Save your ticket number.",
              "Check status with that ticket and email.",
            ]}
            cta="Open request form"
            view="request"
          />
          <HelpPathCard
            eyebrow="IT staff only"
            title="Sign in to IT"
            icon={<Shield className="size-5" />}
            steps={[
              "Sign in with your invited account.",
              "Triage tickets from the dashboard.",
              "Track and update work as it moves.",
            ]}
            cta="Continue to sign in"
            view="login"
            action="outline"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
          <p className="text-xs leading-snug text-muted-foreground">
            There is no public signup. IT accounts are invited by an Admin.
          </p>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" className="shrink-0 rounded-full">
              Got it
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpPathCard({
  eyebrow,
  title,
  icon,
  steps,
  cta,
  view,
  action = "default",
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  steps: string[];
  cta: string;
  view: "request" | "login";
  action?: "default" | "outline";
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
          <h3 className="mt-0.5 text-sm font-semibold tracking-tight">{title}</h3>
        </div>
      </div>
      <ol className="mt-4 flex-1 space-y-2.5">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2.5">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
              {index + 1}
            </span>
            <span className="text-sm leading-snug text-foreground">{step}</span>
          </li>
        ))}
      </ol>
      <Button asChild variant={action} className="help-path-cta mt-5 h-9 w-full rounded-full">
        <DialogClose asChild>
          <Link to="/" search={{ view }}>
            {cta}
            <span className="landing-choice-arrow">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </DialogClose>
      </Button>
    </div>
  );
}

function ChoiceCard({
  view,
  title,
  description,
  cta,
  children,
}: {
  view: "request" | "login";
  title: string;
  description: string;
  cta: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/"
      search={{ view }}
      className="landing-choice-card flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-card p-4 outline-none"
    >
      <div className="rounded-xl border border-border/80 bg-muted/40 p-3">{children}</div>
      <h2 className="mt-3 text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-3 inline-flex items-center text-sm font-medium text-primary">
        {cta}
        <span className="landing-choice-arrow ml-1">→</span>
      </span>
    </Link>
  );
}

function RequestPreview() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ClipboardList className="size-3" />
        </span>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-primary px-2.5 py-1.5 text-[11px] leading-snug text-primary-foreground">
          Payroll overtime is not posting to the payslip. Can IT take a look?
        </div>
      </div>
      <div className="flex items-start justify-end gap-2">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-border bg-card px-2.5 py-1.5 text-[11px] leading-snug text-foreground">
          Request received. Your ticket is R-0001.
        </div>
        <img src="/it-logo.png" alt="" className="mt-0.5 size-6 rounded-full object-cover" />
      </div>
    </div>
  );
}

function ItPreview() {
  return (
    <div className="flex min-h-[5.25rem] flex-col items-center justify-center gap-2 py-1">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Shield className="size-5" />
      </span>
      <div className="w-full max-w-[9.5rem] space-y-1.5">
        <div className="h-1.5 rounded-full bg-muted-foreground/20" />
        <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
        <div className="h-6 rounded-md bg-primary/90" />
      </div>
    </div>
  );
}
