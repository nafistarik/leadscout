"use client";

import { useEffect, useState } from "react";
import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS, readLocalStorage, writeLocalStorage } from "@/lib/storage";

/** Chromium's install event; not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Set by the inline script in the root layout if the event fires before React mounts. */
    __leadscoutInstall?: BeforeInstallPromptEvent;
  }
}

/** A closed popup stays closed this long, so it greets visitors without nagging every page load. */
const DISMISS_DAYS = 7;

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  );
}

function recentlyDismissed(): boolean {
  const at = Number(readLocalStorage(STORAGE_KEYS.installDismissed));
  return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

/** iPhone and iPad (iPadOS reports itself as a Mac with touch). */
function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Offers to install LeadScout as soon as the page opens. Chromium browsers
 * (Android, desktop Chrome and Edge) hand over a real install prompt; iOS has
 * none, so iPhone users get the two Share-menu steps instead. Hidden when the
 * app is already installed, in browsers that cannot install, and for a week
 * after the user closes it.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [closed, setClosed] = useState(false);

  // Subscribes to the browser's install events; the first values exist only in the browser.
  useEffect(() => {
    if (isInstalled() || recentlyDismissed()) return;
    if (window.__leadscoutInstall) setDeferred(window.__leadscoutInstall);
    else if (isIos()) setIos(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setClosed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    writeLocalStorage(STORAGE_KEYS.installDismissed, String(Date.now()));
    setClosed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event works once; a refusal in the browser's own dialog counts as closing ours.
    window.__leadscoutInstall = undefined;
    setDeferred(null);
    if (outcome === "dismissed") dismiss();
    else setClosed(true);
  }

  if (closed || (!deferred && !ios)) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      aria-describedby="install-text"
      className="enter-card neu-float fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-line-soft bg-overlay p-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-96"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- the app's own 5 KB icon */}
        <img src="/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p id="install-title" className="text-sm font-semibold text-ink">
            Install LeadScout
          </p>
          {deferred ? (
            <p id="install-text" className="mt-0.5 text-xs leading-relaxed text-ink2">
              Opens full screen like an app, one tap from your home screen or desktop.
            </p>
          ) : (
            <p id="install-text" className="mt-0.5 text-xs leading-relaxed text-ink2">
              Tap <Share className="inline h-3.5 w-3.5 align-[-2px]" aria-label="Share" /> in the browser bar, then{" "}
              <span className="font-medium text-ink">Add to Home Screen</span>.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
          {deferred ? "Not now" : "Got it"}
        </Button>
        {deferred ? (
          <Button type="button" size="sm" onClick={install}>
            Install
          </Button>
        ) : null}
      </div>
    </div>
  );
}
