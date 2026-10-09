"use client";

import { useState } from "react";
import { FlaskConical, Moon, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { STORAGE_KEYS, readLocalStorage } from "@/lib/storage";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeMode } from "@/hooks/use-theme";

function ThemeOption({
  value,
  label,
  description,
  active,
  onSelect,
  icon,
}: {
  value: ThemeMode;
  label: string;
  description: string;
  active: boolean;
  onSelect: (value: ThemeMode) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={`flex flex-1 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
        active
          ? "border-blue-600 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-950/40"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-blue-600 text-white dark:bg-blue-400 dark:text-zinc-950"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</span>
        <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
      </span>
    </button>
  );
}

export default function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  function handleReset() {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.savedLeads);
      window.localStorage.removeItem(STORAGE_KEYS.lists);
      setResetMessage("Local demo data cleared. Saved leads and your lists were removed from this browser.");
    } catch {
      setResetMessage("Could not access browser storage in this session. Nothing was changed.");
    }
    setConfirmingReset(false);
  }

  const savedCount = (() => {
    try {
      const raw = readLocalStorage(STORAGE_KEYS.savedLeads);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  })();

  const listCount = (() => {
    try {
      const raw = readLocalStorage(STORAGE_KEYS.lists);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  })();

  return (
    <div className="space-y-6">
      <section aria-labelledby="settings-heading">
        <h2 id="settings-heading" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Prototype preferences for the Part 1 demo. No account, API keys, or environment
          variables are required.
        </p>
      </section>

      <section aria-labelledby="appearance-heading">
        <Card>
          <CardHeader>
            <h3 id="appearance-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Appearance
            </h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-3 sm:flex-row" role="group" aria-label="Theme preference">
              <ThemeOption
                value="light"
                label="Light"
                description="Default bright theme."
                active={theme === "light"}
                onSelect={setTheme}
                icon={<Sun className="h-4 w-4" aria-hidden="true" />}
              />
              <ThemeOption
                value="dark"
                label="Dark"
                description="Low-light theme for all pages."
                active={theme === "dark"}
                onSelect={setTheme}
                icon={<Moon className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="demo-mode-heading">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden="true" />
              <h3 id="demo-mode-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Demo-data mode
              </h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <p>
              LeadScout is running in <strong className="font-semibold text-zinc-900 dark:text-zinc-100">local demo mode</strong>.
              All companies, metrics, and activity events are fictional sample records. Availability
              flags (“Website listed”, “Not available”) are illustrative only — no contact details
              are shown and nothing is verified.
            </p>
            <p>
              Saved leads and lists persist in this browser via local storage only. They do not sync
              across devices.
            </p>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="sources-heading">
        <Card>
          <CardHeader>
            <h3 id="sources-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Data sources
            </h3>
          </CardHeader>
          <CardBody className="space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <p>
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Current (Part 1):</strong>{" "}
              a built-in 12-record sample dataset. No network requests to business-data services are
              made.
            </p>
            <p>
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Planned (Part 2):</strong>{" "}
              free public sources such as OpenStreetMap and the Overpass API for real company
              discovery, plus search, filtering, deduplication, lead scoring where supportable, and
              CSV export. The current search form is shaped so it can connect without a UI rewrite.
            </p>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="reset-heading">
        <Card>
          <CardHeader>
            <h3 id="reset-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Local data
            </h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-zinc-600 dark:text-zinc-400" suppressHydrationWarning>
              Currently stored in this browser: {savedCount} saved lead{savedCount === 1 ? "" : "s"},{" "}
              {listCount} local list{listCount === 1 ? "" : "s"}. Your theme preference is kept
              separately and is not affected.
            </p>
            {resetMessage ? (
              <p role="status" className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                {resetMessage}
              </p>
            ) : null}
            {confirmingReset ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Clear all saved leads and lists from this browser?
                </p>
                <p className="mt-1 text-[13px] text-red-700 dark:text-red-300">
                  This cannot be undone. The sample dataset itself is built in and will remain.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" variant="danger" onClick={handleReset}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Yes, clear local data
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmingReset(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Button type="button" variant="danger" onClick={() => { setConfirmingReset(true); setResetMessage(null); }}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Reset local data
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
