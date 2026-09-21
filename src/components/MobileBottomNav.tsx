import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { FileText, Inbox, LayoutDashboard, Layers, Plus, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const pinnedNav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/tracker", label: "Master Tracker", icon: Layers },
] as const;

const defaultLastNav = { to: "/requests", label: "Requests", icon: Inbox } as const;

const moreNav = [
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

type NavItem =
  | (typeof pinnedNav)[number]
  | typeof defaultLastNav
  | (typeof moreNav)[number];

type NavTo = NavItem["to"];

function pathMatches(to: NavTo, pathname: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeMore = moreNav.find((item) => pathMatches(item.to, pathname));
  const lastSlot: NavItem = activeMore ?? defaultLastNav;
  const overflowNav: NavItem[] = activeMore
    ? [defaultLastNav, ...moreNav.filter((item) => item.to !== activeMore.to)]
    : [...moreNav];

  const railRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState<number>();

  useLayoutEffect(() => {
    const rail = railRef.current;
    const more = moreRef.current;
    if (!rail) return;

    const update = () => {
      const railWidth = rail.scrollWidth;
      const moreWidth = moreOpen ? (more?.scrollWidth ?? 0) : 0;
      setBoxWidth(Math.max(railWidth, moreWidth));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    if (more) observer.observe(more);
    return () => observer.disconnect();
  }, [moreOpen, lastSlot.to]);

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
              "transition-[border-radius,width] duration-300 ease-out",
              moreOpen ? "rounded-[1.75rem]" : "rounded-full",
            )}
            style={boxWidth ? { width: boxWidth } : undefined}
          >
            <div ref={railRef} className="flex w-max items-center gap-1.5 px-3 py-2.5">
              {[...pinnedNav, lastSlot].map((item) => (
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
                <div ref={moreRef} className="flex w-max items-center gap-1.5 px-3 pb-1.5">
                  {overflowNav.map((item) => (
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
            className="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-primary text-white shadow-lg"
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
      className="group flex h-10 w-10 items-center justify-center rounded-2xl text-foreground transition-[width,padding,gap,background-color,color] duration-200 data-[status=active]:w-auto data-[status=active]:gap-1.5 data-[status=active]:bg-muted data-[status=active]:px-2.5 data-[status=active]:text-primary"
      activeOptions={{ exact: Boolean(exact) }}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
      <span className="hidden text-xs font-medium whitespace-nowrap group-data-[status=active]:inline">
        {label}
      </span>
    </Link>
  );
}
