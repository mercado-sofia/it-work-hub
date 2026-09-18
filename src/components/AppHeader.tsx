import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { toastError } from "@/lib/user-facing-error";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BackupControls, ExportMenu } from "@/components/DataActions";
import { useTasks } from "@/lib/task-store";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tracker", label: "Master Tracker" },
  { to: "/requests", label: "Requests" },
  { to: "/accomplishments", label: "Accomplishments" },
] as const;

export function AppHeader() {
  const { mode } = useTasks();
  const { user, logout, signingOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  const requestSignOut = () => {
    if (signingOut) return;
    setSignOutConfirm(true);
  };

  const signOut = async () => {
    if (signingOut) return;
    try {
      await logout();
    } catch (error) {
      toastError(error, "Could not sign out. Please try again.");
    }
  };

  return (
    <>
    <header className="sticky top-0 z-40 bg-card text-foreground lg:border-b lg:border-border/70 print:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link to="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
          <img src="/it-logo.png" alt="TrackHub" className="size-9 rounded-full object-cover" />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">TrackHub</p>
            <p className="hidden text-xs text-muted-foreground sm:block">IT Department</p>
          </div>
        </Link>

        <nav className="ml-3 hidden min-w-0 items-center gap-1 lg:flex">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <BackupControls />
            <ExportMenu />
          </div>
          <UserMenu
            name={user?.displayName ?? "IT"}
            role={user?.role ?? "staff"}
            signingOut={signingOut}
            onLogout={requestSignOut}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full px-2.5"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>

      {mode === "management" && (
        <div className="border-t border-[#060d28] bg-[#0B1438] px-4 py-1.5 text-center text-xs font-medium text-white sm:px-6">
          <span className="sm:hidden">Management — read-only view.</span>
          <span className="hidden sm:inline">Management — read-only executive view.</span>
        </div>
      )}
    </header>

    <ConfirmDialog
      open={signOutConfirm}
      onOpenChange={setSignOutConfirm}
      icon={LogOut}
      title="Sign Out"
      description="You’re going to sign out of TrackHub. Are you sure?"
      confirmLabel="Confirm sign out"
      confirmDisabled={signingOut}
      onConfirm={() => void signOut()}
    />
    </>
  );
}

function NavLink({
  to,
  label,
}: {
  to: "/dashboard" | "/tracker" | "/requests" | "/accomplishments";
  label: string;
}) {
  return (
    <Link
      to={to}
      className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      activeProps={{
        className:
          "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold text-primary !text-primary",
      }}
      activeOptions={{ exact: to === "/dashboard" }}
    >
      {label}
    </Link>
  );
}

function UserMenu({
  name,
  role,
  signingOut,
  onLogout,
}: {
  name: string;
  role: string;
  signingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden rounded-full px-2.5 lg:inline-flex"
          aria-label={`Account menu for ${name}`}
          title={name}
        >
          <User className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max min-w-36">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="whitespace-nowrap">{name}</p>
          <p className="text-xs font-normal capitalize text-muted-foreground">{role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="gap-2">
            <Settings className="size-3.5" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" disabled={signingOut} onSelect={onLogout}>
          {signingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
