import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  onConfirm: () => void;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  confirmDisabled?: boolean;
  contentClassName?: string;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "No, keep it",
  icon: Icon = Trash2,
  onConfirm,
  trigger,
  open,
  onOpenChange,
  children,
  confirmDisabled = false,
  contentClassName,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      {...(typeof open === "boolean" ? { open } : {})}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent
        className={cn(
          "max-h-none w-[min(100%-1.5rem,22.5rem)] max-w-[22.5rem] gap-5 overflow-visible rounded-[1.75rem] border-0 bg-card px-7 py-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
          contentClassName,
        )}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Icon className="size-5 text-primary" strokeWidth={1.75} />
        </div>
        <AlertDialogHeader className="space-y-2 text-center sm:text-center">
          <AlertDialogTitle className="text-[1.35rem] font-bold tracking-tight">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-relaxed sm:text-[13px]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="flex flex-row gap-3 sm:justify-stretch sm:space-x-0">
          <AlertDialogCancel className="mt-0 h-11 flex-1 rounded-full border-0 bg-muted text-foreground shadow-none hover:bg-muted/80">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-11 flex-1 rounded-full shadow-none"
            disabled={confirmDisabled}
            onClick={(event) => {
              if (confirmDisabled) {
                event.preventDefault();
                return;
              }
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
