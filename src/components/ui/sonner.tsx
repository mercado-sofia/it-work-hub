import { Check, Info, TriangleAlert, X } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/lib/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const glyph = { className: "size-4", strokeWidth: 2.25 } as const;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      closeButton
      icons={{
        success: <Check {...glyph} />,
        info: <Info {...glyph} />,
        warning: <TriangleAlert {...glyph} />,
        error: <TriangleAlert {...glyph} />,
        close: <X className="size-4" strokeWidth={2} />,
      }}
      toastOptions={{
        closeButton: true,
        classNames: {
          toast: "group toast font-sans w-full max-w-full sm:max-w-sm",
          title: "font-normal leading-snug break-words",
          description: "break-words",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
