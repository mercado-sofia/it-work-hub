import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileItemCardSlotProps = {
  className?: string;
  children?: ReactNode;
};

type MobileItemCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  idLabel: ReactNode;
  badge: ReactNode;
  date: string;
  dateClassName?: string | undefined;
  actions?: ReactNode | undefined;
  className?: string;
  asChild?: boolean;
  children?: ReactElement<MobileItemCardSlotProps>;
};

function MobileItemCardBody({
  icon: Icon,
  title,
  subtitle,
  idLabel,
  badge,
  date,
  dateClassName,
  actions,
}: Omit<MobileItemCardProps, "className" | "asChild" | "children">) {
  return (
    <>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-dashed border-border pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="size-3.5 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 truncate">{idLabel}</span>
        </span>
        <span className="shrink-0">{badge}</span>
        <span className={cn("ml-auto shrink-0 text-xs tabular-nums text-muted-foreground", dateClassName)}>
          {date}
        </span>
      </div>
      {actions ? <div className="mt-3 flex items-center justify-end gap-1">{actions}</div> : null}
    </>
  );
}

export function MobileItemCard({ asChild = false, className, children, ...fields }: MobileItemCardProps) {
  const classes = cn("block min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm", className);
  const inner = <MobileItemCardBody {...fields} />;

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      className: cn(classes, children.props.className),
      children: inner,
    });
  }

  return <div className={classes}>{inner}</div>;
}
