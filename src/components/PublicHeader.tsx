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
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <BackButton />
        <Link to="/" search={{}} className="flex min-w-0 items-center gap-2.5">
          <img src="/it-logo.png" alt="TrackHub" className="size-9 rounded-full object-cover" />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold tracking-tight">IT Request Portal</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Look up a submitted ticket</p>
          </div>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <Link
            to="/request/status"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
            activeProps={{ className: "rounded-full px-3 py-1.5 text-sm font-semibold text-primary" }}
          >
            Check status
          </Link>
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
        </nav>
      </div>
    </header>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
