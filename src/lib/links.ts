/**
 * Pure contact-link helpers. OpenStreetMap tag values are untrusted input:
 * websites, phones, and emails are validated/normalized before rendering so
 * unsafe URL protocols can never become clickable links. Missing or invalid
 * values stay missing — never invented.
 */

const MAX_URL_LENGTH = 2048;
const ALLOWED_SCHEMES = new Set(["http", "https"]);
const BLOCKED_SCHEMES = new Set(["javascript", "data", "vbscript", "file", "blob", "ftp"]);

function schemeOf(value: string): string | null {
  const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.exec(value);
  return match ? match[0].slice(0, -1).toLowerCase() : null;
}

/**
 * Normalizes a raw website tag into a safe absolute https/http URL, or null.
 * Schemeless hosts gain `https://`; dangerous schemes and malformed values
 * are rejected outright.
 */
export function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH || /\s/.test(trimmed)) return null;
  const scheme = schemeOf(trimmed);
  if (scheme) {
    if (!ALLOWED_SCHEMES.has(scheme)) return null;
    return trimmed;
  }
  if (BLOCKED_SCHEMES.has(trimmed.split(":")[0].toLowerCase())) return null;
  return `https://${trimmed}`;
}

/** Short human-readable label for a (normalized) website URL. */
export function websiteDisplayLabel(url: string): string {
  const label = url.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return label.length > 30 ? `${label.slice(0, 29)}…` : label;
}

/** Builds a `tel:` target from a raw phone tag, or null when unusable. */
export function phoneHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const dialable = phone.replace(/[^+\d]/g, "");
  const digits = dialable.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return `tel:${dialable}`;
}

/**
 * Minimal plausibility check before rendering a `mailto:` link. This guards
 * link construction only — it never invents or corrects addresses.
 */
export function isPlausibleEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254 || /\s/.test(trimmed)) return false;
  if (/[<>"(),;:\\[\]]/.test(trimmed)) return false;
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || !domain.includes(".")) return false;
  return true;
}
