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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  shortDescription?: string;
  icon: LucideIcon;
  children: ReactNode;
  footer: ReactNode;
  trigger?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent
        className={cn(
          "flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 sm:max-w-3xl",
          contentClassName,
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-5 py-4 text-left">
          <div className="flex items-start gap-3 pr-6">
            <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-border text-primary">
              <Icon className="size-4" strokeWidth={1.25} />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-sm font-semibold text-foreground sm:text-base">
                {title}
              </DialogTitle>
              <DialogDescription>
                {shortDescription ? (
                  <>
                    <span className="sm:hidden">{shortDescription}</span>
                    <span className="hidden sm:inline">{description}</span>
                  </>
                ) : (
                  description
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {children}
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
