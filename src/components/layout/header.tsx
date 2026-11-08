"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { CONTAINER_CLASS } from "@/components/layout/container";
import { Wordmark } from "@/components/layout/sidebar";
import { cn } from "@/lib/storage";

/** Each page's title and one line on what it is for (the app is too shallow for a breadcrumb). */
const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Follow-ups due and how your outreach is going" },
  "/find-companies": { title: "Find Companies", subtitle: "Search any city for businesses that need a website" },
  "/saved-leads": { title: "Saved Leads", subtitle: "Message your leads and track every reply" },
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

export function Header({ pathname }: { pathname: string }) {
  const meta = TITLES[pathname] ?? { title: "LeadScout", subtitle: "" };

  return (
    <header className="enter-drop sticky top-0 z-20 border-b border-line bg-app/95 backdrop-blur">
      <div className={`${CONTAINER_CLASS} flex h-16 items-center gap-3`}>

        {/* Below lg there is no sidebar, so the top bar carries the logo; the tab bar and the page itself say where you are. */}
        <Link href="/" className="flex min-w-0 flex-1 items-center lg:hidden" aria-label="LeadScout home">
          <Wordmark className="h-[22px]" />
        </Link>
        <div className="sr-only min-w-0 flex-1 lg:not-sr-only">
          <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-ink">{meta.title}</h1>
          {meta.subtitle ? <p className="truncate text-xs text-ink3">{meta.subtitle}</p> : null}
        </div>

        <ThemeSwitch />
      </div>
    </header>
  );
}
