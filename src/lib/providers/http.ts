import { ProviderError } from "@/lib/providers/types";

/**
 * Fetch with a hard timeout. The timeout abort is surfaced as a `timeout`
 * ProviderError so the UI can explain slow public APIs distinctly from other
 * failures.
 */
export async function fetchWithTimeout(
  url: string,
  options: {
    signal?: AbortSignal;
    timeoutMs: number;
    headers?: Record<string, string>;
    method?: "GET" | "POST";
    body?: URLSearchParams;
  },
): Promise<Response> {
  const controller = new AbortController();
  const onAbort = (): void => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: options.headers,
      method: options.method,
      body: options.body,
    });
  } catch (error) {
    if (controller.signal.aborted && !(options.signal?.aborted)) {
      throw new ProviderError("timeout", "The request took too long and was stopped. Public data services can be slow at peak times.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Reads a JSON response body with its own deadline. `fetch()` only waits for
 * response headers, so a stalled body would otherwise hang the caller
 * forever with no timeout and no error — the UI would sit in loading limbo.
 * On timeout a `timeout` ProviderError is thrown; caller aborts surface as
 * raw AbortError so existing abort handling applies.
 */
export async function readJsonBody(
  response: Response,
  options: { signal?: AbortSignal; timeoutMs: number },
): Promise<unknown> {
  // Settle deterministically when already aborted: Promise.race resolves
  // pre-settled promises in array order, so without this a fast body would
  // incorrectly win over the abort.
  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(
        new ProviderError(
          "timeout",
          "The response took too long and was stopped. Public data services can be slow at peak times.",
        ),
      );
    }, options.timeoutMs);
  });
  const aborted = new Promise<never>((_, reject) => {
    const abortError = (): DOMException => new DOMException("Aborted", "AbortError");
    if (options.signal?.aborted) {
      reject(abortError());
      return;
    }
    options.signal?.addEventListener("abort", () => reject(abortError()), { once: true });
  });
  try {
    return (await Promise.race([response.json(), timeout, aborted])) as unknown;
  } catch (error) {
    // Normalize races narrowly lost to teardown: a timeout that fires while
    // the body is being torn down (or vice versa) must still report timeout,
    // and a caller abort must still look like an abort to existing handlers.
    if (timedOut && !(error instanceof ProviderError)) {
      throw new ProviderError(
        "timeout",
        "The response took too long and was stopped. Public data services can be slow at peak times.",
      );
    }
    if (options.signal?.aborted && !(error instanceof ProviderError)) {
      throw new DOMException("Aborted", "AbortError");
    }
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function browserIsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Normalizes unknown fetch failures into ProviderErrors the UI can render.
 *
 * A browser `fetch` rejects with a bare TypeError both when the device is
 * offline AND when the server answers with an error page that lacks CORS
 * headers (public OSM servers do this for 406 blocks, 500s and overloads) —
 * the real status is hidden from page scripts. Only `navigator.onLine`
 * reliably separates the two, so the message names the service instead of
 * blaming the user's connection.
 */
export function toProviderError(error: unknown, serviceName: string): ProviderError {
  if (error instanceof ProviderError) return error;
  if (isAbortError(error)) {
    return new ProviderError("timeout", "The request was stopped before it completed.");
  }
  if (browserIsOffline()) {
    return new ProviderError(
      "network",
      "Your browser reports that it is offline. Reconnect to the internet and try again.",
    );
  }
  return new ProviderError(
    "unavailable",
    `${serviceName} refused or dropped the request (the server returned an error or blocked it). This is a problem with the public service, not your connection.`,
  );
}
