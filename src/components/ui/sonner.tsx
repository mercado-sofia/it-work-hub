import { X } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/lib/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const accentToast = "group-[.toaster]:border-primary group-[.toaster]:text-primary";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      closeButton
      icons={{
        close: <X className="size-3.5" strokeWidth={2} />,
      }}
      toastOptions={{
        closeButton: true,
        classNames: {
          toast:
            "group toast group-[.toaster]:border group-[.toaster]:shadow-lg group-[.toaster]:font-sans",
          description: "group-[.toast]:text-current/80",
          closeButton: "group-[.toast]:border-0 group-[.toast]:bg-transparent group-[.toast]:text-current",
          success: accentToast,
          info: accentToast,
          default: accentToast,
          error: "group-[.toaster]:border-destructive group-[.toaster]:text-destructive",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
