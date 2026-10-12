"use client";

import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { CONTAINER_CLASS } from "@/components/layout/container";
import { cn } from "@/lib/storage";

const TITLES: Record<string, { title: string; trail: string }> = {
  "/": { title: "Dashboard", trail: "Home / Dashboard" },
  "/find-companies": { title: "Find Companies", trail: "Home / Find Companies" },
  "/saved-leads": { title: "Saved Leads", trail: "Home / Saved Leads" },
};

function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={`Color theme, currently ${dark ? "dark" : "light"}. Activate to switch to ${dark ? "light" : "dark"}.`}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
      className="neu-recessed relative h-8 w-[60px] shrink-0 cursor-pointer rounded-full border border-line-soft bg-recessed"
    >
      <Sun
        aria-hidden="true"
        className="absolute left-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3"
      />
      <Moon
        aria-hidden="true"
        className="absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3"
      />
      <span
        aria-hidden="true"
        className={cn(
          "neu-raised-sm absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-raised text-accent-ink",
          "transition-transform [transition-duration:var(--duration-base)] [transition-timing-function:var(--ease-out)]",
          dark ? "translate-x-8" : "translate-x-1",
        )}
      >
        {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}

export function Header({
  pathname,
  onOpenMobileNav,
}: {
  pathname: string;
  onOpenMobileNav: () => void;
}) {
  const meta = TITLES[pathname] ?? { title: "LeadScout", trail: "Home" };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-app/95 backdrop-blur">
      <div className={`${CONTAINER_CLASS} flex h-16 items-center gap-3`}>
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="neu-raised-sm neu-pressable inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-line-soft bg-raised text-ink2 hover:bg-alt hover:text-ink md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="hidden text-xs text-ink3 sm:block">{meta.trail}</p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink">
            {meta.title}
          </h1>
        </div>

        <ThemeSwitch />
      </div>
    </header>
  );
}

export function MobileNavCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close navigation menu"
      className="neu-raised-sm neu-pressable inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-line-soft bg-raised text-ink2 hover:bg-alt hover:text-ink"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
