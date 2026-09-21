import { cn } from "@/lib/utils";

export function CircleSplash({
  label = "Loading TrackHub",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-svh flex-col items-center justify-center bg-white px-6 font-sans dark:bg-background",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="relative size-16">
        <img src="/it-logo.png" alt="" className="size-16 rounded-full object-cover" />
        <span
          className="absolute -inset-1.5 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
          aria-hidden
        />
      </div>
    </div>
  );
}
