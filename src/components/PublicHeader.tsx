import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

function PublicHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card text-foreground print:hidden">
      <div className="mx-auto flex h-14 min-w-0 max-w-3xl items-center gap-1 px-3 sm:gap-3 sm:px-6">
        <BackButton className="shrink-0 px-2 sm:px-2.5" />
        <Link to="/" search={{}} className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <img src="/it-logo.png" alt="IT Request Portal" className="size-8 shrink-0 rounded-full object-cover sm:size-9" />
          <div className="min-w-0 leading-tight">
            <p className="hidden truncate text-sm font-semibold tracking-tight sm:block">IT Request Portal</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Look up a submitted ticket</p>
          </div>
        </Link>
        <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/request/status"
            className="inline-flex h-9 items-center rounded-full px-2 text-sm font-medium text-muted-foreground hover:text-primary sm:px-3"
            activeProps={{ className: "inline-flex h-9 items-center rounded-full px-2 text-sm font-semibold text-primary sm:px-3" }}
          >
            Check status
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full px-2 sm:px-2.5"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh overflow-x-hidden bg-background font-sans text-foreground">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-3 py-5 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
