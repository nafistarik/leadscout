import { fetchWithTimeout, isAbortError, readJsonBody } from "@/lib/providers/http";
import { normalizeWebsiteUrl } from "@/lib/links";
import { analyzeHtml, unreachableAnalysis } from "@/lib/website-analysis";
import type { WebsiteAnalysis } from "@/lib/website-analysis";

/**
 * Loads a business homepage through the free, keyless Jina Reader
 * (https://r.jina.ai) — browsers cannot fetch arbitrary sites directly
 * because of CORS, and the app has no backend. The reader renders the page
 * and returns its HTML; the site address is shared with Jina AI.
 *
 * Keyless use is limited to 20 requests/minute per IP, so callers must run
 * checks one at a time (see the analysis queue) and back off on a 429.
 * The reader ignores certificate errors, so "https: yes" means the https
 * address loaded, not that its certificate is valid.
 */

const READER_URL = "https://r.jina.ai/";
const REQUEST_TIMEOUT_MS = 45_000;
const BODY_TIMEOUT_MS = 20_000;
/** ≥3.2 s between reader requests keeps a tab under ~19 requests/minute. */
const MIN_REQUEST_GAP_MS = 3_200;

let lastRequestAt = 0;

async function waitForReaderSlot(signal: AbortSignal): Promise<void> {
  const waitMs = Math.max(0, lastRequestAt + MIN_REQUEST_GAP_MS - Date.now());
  lastRequestAt = Date.now() + waitMs;
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  if (waitMs === 0) return;
  await new Promise<void>((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, waitMs);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export class ReaderError extends Error {
  readonly rateLimited: boolean;

  constructor(message: string, rateLimited = false) {
    super(message);
    this.name = "ReaderError";
    this.rateLimited = rateLimited;
  }
}

type ReadResult = { ok: true; html: string; httpStatus: number | null } | { ok: false; reason: string };

interface ReaderPayload {
  code?: unknown;
  message?: unknown;
  readableMessage?: unknown;
  data?: { html?: unknown; httpStatus?: unknown } | null;
}

function siteFailureReason(message: string): string {
  if (/could not be resolved|ENOTFOUND|NXDOMAIN/i.test(message)) return "Domain does not exist (DNS lookup failed).";
  if (/timeout/i.test(message)) return "The website did not respond (timed out).";
  if (/refused|reset|peer|ECONN/i.test(message)) return "The website refused or dropped the connection.";
  return `The website could not be loaded (${message.slice(0, 120)}).`;
}

/**
 * One reader request. Throws ReaderError for reader-side problems
 * (rate limit, outage) — those must not be cached as a site verdict.
 */
async function readOnce(url: string, signal: AbortSignal): Promise<ReadResult> {
  await waitForReaderSlot(signal);
  let response: Response;
  try {
    response = await fetchWithTimeout(`${READER_URL}${url}`, {
      signal,
      timeoutMs: REQUEST_TIMEOUT_MS,
      headers: { Accept: "application/json", "X-Return-Format": "html" },
    });
  } catch (error) {
    if (isAbortError(error) && signal.aborted) throw error;
    throw new ReaderError("The website reader (r.jina.ai) could not be reached. Try again shortly.");
  }
  if (response.status === 429) {
    throw new ReaderError("The free website reader allows about 20 checks per minute. Pausing, then continuing.", true);
  }
  let payload: ReaderPayload | null = null;
  try {
    payload = (await readJsonBody(response, { signal, timeoutMs: BODY_TIMEOUT_MS })) as ReaderPayload;
  } catch (error) {
    if (isAbortError(error) && signal.aborted) throw error;
    payload = null;
  }
  if (response.ok && payload?.data && typeof payload.data.html === "string") {
    const httpStatus = typeof payload.data.httpStatus === "number" ? payload.data.httpStatus : null;
    return { ok: true, html: payload.data.html, httpStatus };
  }
  // 4xx (422 in practice) = the reader reached its own verdict about the site.
  if (response.status >= 400 && response.status < 500) {
    const message =
      (typeof payload?.message === "string" && payload.message) ||
      (typeof payload?.readableMessage === "string" && payload.readableMessage) ||
      `HTTP ${response.status}`;
    return { ok: false, reason: siteFailureReason(message) };
  }
  throw new ReaderError(`The website reader returned an error (HTTP ${response.status}). Try again shortly.`);
}

/**
 * Analyzes a business website: tries the https address first (which also
 * answers "does it support HTTPS?"), then the listed address if different.
 */
export async function checkWebsite(rawUrl: string, signal: AbortSignal): Promise<WebsiteAnalysis> {
  const listed = normalizeWebsiteUrl(rawUrl);
  if (!listed) return unreachableAnalysis(rawUrl, "The listed website address is not a valid URL.", new Date());
  const httpsUrl = listed.replace(/^http:\/\//i, "https://");
  const attempts = httpsUrl === listed ? [listed] : [httpsUrl, listed];
  let lastReason = "The website could not be loaded.";
  for (const url of attempts) {
    const result = await readOnce(url, signal);
    if (result.ok) return analyzeHtml({ html: result.html, url, httpStatus: result.httpStatus, now: new Date() });
    lastReason = result.reason;
    // A missing domain fails identically over http; skip the second request.
    if (/DNS lookup failed/.test(result.reason)) break;
  }
  return unreachableAnalysis(listed, lastReason, new Date());
}
