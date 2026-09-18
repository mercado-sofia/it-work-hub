import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function accentLastWord(title: string) {
  const words = title.trim().split(/\s+/);
  const last = words.pop();
  if (!last) return title;
  if (words.length === 0) {
    return <span className="text-primary">{last}</span>;
  }
  return (
    <>
      {words.join(" ")} <span className="text-primary">{last}</span>
    </>
  );
}

export function PageHeading({
  title,
  desktopTitle,
  lead,
  subtitle,
  hideSubtitleOnMobile,
  greeting = false,
  accent = true,
  compact = false,
  actions,
  className,
}: {
  title: string;
  desktopTitle?: string;
  lead?: string;
  subtitle?: ReactNode;
  hideSubtitleOnMobile?: boolean;
  greeting?: boolean;
  accent?: boolean;
  compact?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  const { user } = useAuth();
  const firstName = user?.displayName?.trim().split(/\s+/)[0] ?? "there";
  const mobileTitle = accent ? accentLastWord(title) : title;

  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {greeting ? (
          <p className="text-sm text-muted-foreground lg:hidden">
            {timeOfDayGreeting()}, {firstName}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-display tracking-tight text-foreground lg:text-xl lg:font-semibold",
            compact
              ? "text-lg font-semibold leading-snug"
              : "max-lg:text-[1.85rem] max-lg:font-bold max-lg:leading-[1.15]",
            greeting && "max-lg:mt-1",
          )}
        >
          <span className="lg:hidden">
            {lead ? (
              <>
                {lead} {mobileTitle}
              </>
            ) : (
              mobileTitle
            )}
          </span>
          <span className="hidden lg:inline">{desktopTitle ?? title}</span>
        </h1>
        {subtitle ? (
          <div
            className={cn(
              "mt-1 break-words text-xs text-muted-foreground",
              hideSubtitleOnMobile && "hidden lg:block",
            )}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
