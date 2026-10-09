"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Moon, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { STORAGE_KEYS, readLocalStorage } from "@/lib/storage";
import { sanitizeRecords } from "@/lib/saved-leads";
import { notifyStorageChanged } from "@/hooks/use-local-storage-value";
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
      className={`neu-pressable flex flex-1 items-start gap-3 rounded-lg border p-4 text-left ${
        active
          ? "neu-recessed border-accent bg-recessed"
          : "border-line-soft bg-raised hover:bg-alt"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-accent text-on-accent"
            : "neu-recessed bg-recessed text-ink2"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-ink3">{description}</span>
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
      window.localStorage.removeItem(STORAGE_KEYS.savedLeadsV2);
      window.localStorage.removeItem(STORAGE_KEYS.lists);
      window.localStorage.removeItem(STORAGE_KEYS.searchPresets);
      window.localStorage.removeItem(STORAGE_KEYS.leadWorkflow);
      // Notify subscribers: direct removals bypass the storage hooks'
      // writers, so without this the UI would show stale data until refresh.
      notifyStorageChanged();
      setResetMessage(
        "Local data cleared. Saved leads, lists, saved search setups, and lead research data were removed from this browser.",
      );
    } catch {
      setResetMessage("Could not access browser storage in this session. Nothing was changed.");
    }
    setConfirmingReset(false);
  }

  const savedCount = (() => {
    try {
      // Prefer the v2 envelope; fall back to the legacy Part 1 id list.
      const v2 = sanitizeRecords(
        (() => {
          try {
            return JSON.parse(readLocalStorage(STORAGE_KEYS.savedLeadsV2) ?? "null");
          } catch {
            return [];
          }
        })(),
      );
      if (v2.length > 0 || readLocalStorage(STORAGE_KEYS.savedLeadsV2) !== null) return v2.length;
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
        <h2 id="settings-heading" className="text-xl font-bold tracking-tight text-ink">
          Settings
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink2">
          Search live business data, manage saved leads locally, and customize the theme. No
          account, API keys, or environment variables are required.
        </p>
      </section>

      <section aria-labelledby="appearance-heading">
        <Card>
          <CardHeader>
            <h3 id="appearance-heading" className="text-sm font-semibold text-ink">
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
              <FlaskConical className="h-4 w-4 text-status-demo-fg" aria-hidden="true" />
              <h3 id="demo-mode-heading" className="text-sm font-semibold text-ink">
                Demo-data mode
              </h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3 text-sm leading-relaxed text-ink2">
            <p>
              <strong className="font-semibold text-ink">Sample dataset:</strong>{" "}
              a built-in set of 12 fictional companies. Availability flags (“Website listed”,
              “Not available”) are illustrative only — no contact details are shown and nothing
              is verified. Sample content is always badged as demo data.
            </p>
            <p>
              <strong className="font-semibold text-ink">Live search:</strong>{" "}
              real businesses resolved from OpenStreetMap data. Only details the source provides
              (website, phone, email, opening hours) are shown; missing fields stay blank.
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
            <h3 id="sources-heading" className="text-sm font-semibold text-ink">
              Data sources
            </h3>
          </CardHeader>
          <CardBody className="space-y-3 text-sm leading-relaxed text-ink2">
            <p>
              <strong className="font-semibold text-ink">Live discovery:</strong>{" "}
              OpenStreetMap data via the public Overpass API (bounded geographic queries) and
              Nominatim for place lookup. Results are cached briefly in memory, and identical
              simultaneous searches share one request to respect rate limits. Coverage depends on
              community mapping and is never exhaustive. ©{" "}
              <Link
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent-ink underline-offset-2 hover:underline"
              >
                OpenStreetMap
              </Link>{" "}
              contributors.
            </p>
            <p>
              <strong className="font-semibold text-ink">Samples:</strong>{" "}
              the built-in 12-record fictional dataset used by demo mode. No network requests are
              made for sample content.
            </p>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="reset-heading">
        <Card>
          <CardHeader>
            <h3 id="reset-heading" className="text-sm font-semibold text-ink">
              Local data
            </h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-ink2" suppressHydrationWarning>
              Currently stored in this browser: {savedCount} saved lead{savedCount === 1 ? "" : "s"},{" "}
              {listCount} local list{listCount === 1 ? "" : "s"}. Your theme preference is kept
              separately and is not affected.
            </p>
            {resetMessage ? (
              <p role="status" className="neu-recessed mt-3 rounded-lg bg-recessed p-3 text-sm text-ink2">
                {resetMessage}
              </p>
            ) : null}
            {confirmingReset ? (
              <div className="mt-4 rounded-lg border border-status-error-line bg-status-error-bg p-4">
                <p className="text-sm font-medium text-status-error-fg">
                  Clear all saved leads and lists from this browser?
                </p>
                <p className="mt-1 text-[13px] text-status-error-fg opacity-90">
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
