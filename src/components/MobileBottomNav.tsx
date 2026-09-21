import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Inbox, LayoutDashboard, Layers, Plus, Settings, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/tracker", label: "Master Tracker", icon: Layers },
  { to: "/requests", label: "Requests", icon: Inbox },
] as const;

const moreNav = [
  { to: "/accomplishments", label: "Accomplishments", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

type NavTo = (typeof primaryNav)[number]["to"] | (typeof moreNav)[number]["to"];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const moreActive = moreNav.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          aria-label="Close more navigation"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden print:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      <nav
        aria-label="Mobile navigation"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center lg:hidden print:hidden"
      >
        <div className="pointer-events-auto flex items-end gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div
            className={cn(
              "overflow-hidden border border-border/70 bg-white shadow-lg dark:bg-card",
              "transition-[border-radius] duration-300 ease-out",
              moreOpen ? "rounded-[1.75rem]" : "rounded-full",
            )}
          >
            <div className="flex items-center gap-1.5 px-3 py-2.5">
              {primaryNav.map((item) => (
                <NavIcon
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  exact={"exact" in item && item.exact}
                  onNavigate={() => setMoreOpen(false)}
                />
              ))}
            </div>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                moreOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden" inert={!moreOpen}>
                <div className="grid grid-cols-3 gap-1.5 px-3 pb-1.5">
                  {moreNav.map((item) => (
                    <NavIcon
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      onNavigate={() => setMoreOpen(false)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label={moreOpen ? "Close more" : "More"}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              "flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-white shadow-lg transition-colors dark:bg-card",
              moreActive || moreOpen ? "text-primary" : "text-foreground",
            )}
          >
            <Plus
              className={cn("size-5 transition-transform duration-300 ease-out", moreOpen && "rotate-45")}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </nav>
    </>
  );
}

function NavIcon({
  to,
  label,
  icon: Icon,
  exact,
  onNavigate,
}: {
  to: NavTo;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-label={label}
      className="flex h-11 w-14 items-center justify-center rounded-2xl text-foreground transition-colors"
      activeProps={{
        className: "flex h-11 w-14 items-center justify-center rounded-2xl bg-muted text-primary",
      }}
      activeOptions={{ exact: Boolean(exact) }}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </Link>
  );
}
