import * as React from "react";

import { cn } from "@/lib/utils";

const TEMPORAL_TYPES = new Set(["date", "datetime-local", "month", "week", "time"]);

function openPicker(el: HTMLInputElement) {
  try {
    el.showPicker?.();
  } catch {
    /* already open or unsupported */
  }
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onClick, ...props }, ref) => {
    const isTemporal = typeof type === "string" && TEMPORAL_TYPES.has(type);

    return (
      <input
        type={type}
        className={cn(
          "h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isTemporal
            ? "relative cursor-pointer overflow-hidden pe-9 outline-none focus:border-input focus:outline-none focus-visible:border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            : "flex",
          className,
        )}
        ref={ref}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || !isTemporal || event.currentTarget.disabled) return;
          openPicker(event.currentTarget);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
