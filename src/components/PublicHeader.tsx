import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

function PublicHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white print:hidden dark:bg-card">
      <div className="mx-auto flex h-14 min-w-0 max-w-4xl items-center gap-1 px-8 sm:gap-3 sm:px-6">
        <BackButton className="shrink-0 px-2 sm:px-2.5" />
        <Link to="/" search={{}} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img src="/it-logo.png" alt="" className="size-8 shrink-0 rounded-full object-cover sm:size-9" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">TrackHub</p>
            <p className="hidden text-xs text-muted-foreground sm:block">IT Department</p>
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
    <div className="min-h-svh overflow-x-hidden bg-white font-sans text-foreground dark:bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-8 py-5 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
