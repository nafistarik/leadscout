import { ProviderError } from "@/lib/providers/types";

/**
 * Fetch with a hard timeout. The timeout abort is surfaced as a `timeout`
 * ProviderError so the UI can explain slow public APIs distinctly from other
 * failures.
 */
export async function fetchWithTimeout(
  url: string,
  options: { signal?: AbortSignal; timeoutMs: number; headers?: Record<string, string> },
): Promise<Response> {
  const controller = new AbortController();
  const onAbort = (): void => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: options.headers });
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

/** Normalizes unknown fetch failures into ProviderErrors the UI can render. */
export function toProviderError(error: unknown, fallbackMessage: string): ProviderError {
  if (error instanceof ProviderError) return error;
  if (isAbortError(error)) {
    return new ProviderError("timeout", "The request was stopped before it completed.");
  }
  if (error instanceof TypeError) {
    return new ProviderError(
      "network",
      "Could not reach the data service. Check your connection and try again.",
    );
  }
  return new ProviderError("network", fallbackMessage);
}
