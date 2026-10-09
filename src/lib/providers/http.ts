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
