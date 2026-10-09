import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/storage";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "neu-raised-sm neu-pressable border-transparent bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed",
  secondary:
    "neu-raised-sm neu-pressable border-line-soft bg-raised text-ink hover:bg-alt",
  ghost: "border-transparent text-ink2 hover:bg-recessed",
  danger:
    "neu-raised-sm neu-pressable border-status-error-line bg-status-error-bg text-status-error-fg hover:brightness-95 dark:hover:brightness-125",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export function Button({ variant = "primary", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border font-medium",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
    >
      {children}
    </button>
  );
}
