import type { ReactNode } from "react";
import { cn } from "@/lib/storage";

type BadgeTone = "neutral" | "info" | "success" | "warning";

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-recessed text-ink2 ring-line",
  info: "bg-status-info-bg text-status-info-fg ring-status-info-line",
  success: "bg-status-success-bg text-status-success-fg ring-status-success-line",
  warning: "bg-status-warning-bg text-status-warning-fg ring-status-warning-line",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

