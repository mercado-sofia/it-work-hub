import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackButton({
  fallback = "/",
  className,
}: {
  fallback?: "/" | "/requests";
  className?: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();

  const goBack = () => {
    if (canGoBack()) {
      router.history.back();
      return;
    }
    if (fallback === "/") {
      void navigate({ to: "/", search: {} });
      return;
    }
    void navigate({ to: fallback });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "bootstrap-back -ml-1.5 rounded-full px-2.5 hover:bg-transparent hover:text-primary",
        className,
      )}
      onClick={goBack}
      aria-label="Go back"
    >
      <span className="landing-choice-arrow">
        <ChevronLeft className="size-4" />
      </span>
      Back
    </Button>
  );
}

function canGoBack() {
  if (typeof window === "undefined") return false;
  if (window.history.length <= 1) return false;
  const referrer = document.referrer;
  if (!referrer) return true;
  try {
    return new URL(referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}
