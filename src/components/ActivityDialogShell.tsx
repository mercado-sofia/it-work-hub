import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ActivityDialogShell({
  open,
  onOpenChange,
  title,
  description,
  shortDescription,
  icon: Icon,
  children,
  footer,
  trigger,
  contentClassName,
  insetClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  shortDescription?: string | undefined;
  icon: LucideIcon;
  children: ReactNode;
  footer: ReactNode;
  trigger?: ReactNode;
  contentClassName?: string | undefined;
  insetClassName?: string | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent
        className={cn(
          "flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden border border-border bg-card p-0 lg:max-w-3xl lg:rounded-xl",
          contentClassName,
        )}
      >
        <DialogHeader className={cn("shrink-0 space-y-0 border-b border-border px-5 py-4 text-left max-lg:pt-5 max-lg:pb-5", insetClassName)}>
          <div className={cn("flex gap-3 pr-6", description ? "items-start max-lg:items-center" : "items-center")}>
            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full border border-border text-primary",
                description && "mt-0.5 max-lg:mt-0",
              )}
            >
              <Icon className="size-4" strokeWidth={1.25} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="text-xl font-semibold text-foreground lg:text-base">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="sm:text-[13px]">
                  {shortDescription ? (
                    <>
                      <span className="sm:hidden">{shortDescription}</span>
                      <span className="hidden sm:inline">{description}</span>
                    </>
                  ) : (
                    description
                  )}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{title}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {children}
        </div>
        <DialogFooter className={cn("shrink-0 gap-2 border-t border-border bg-muted/30 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end max-lg:gap-3 max-lg:pt-5 max-lg:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-lg:[&_button]:h-12", insetClassName)}>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
