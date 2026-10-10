import { describe, expect, test } from "bun:test";
import { readJsonBody } from "@/lib/providers/http";
import { ProviderError } from "@/lib/providers/types";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function stalledResponse(): Response {
  // Headers deliverable, body that never produces bytes — the stall shape
  // that used to hang searches in loading limbo forever.
  const stream = new ReadableStream({
    start() {
      /* never enqueue, never close */
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("readJsonBody", () => {
  test("resolves parsed JSON for healthy responses", async () => {
    const data = await readJsonBody(jsonResponse({ elements: [1, 2] }), { timeoutMs: 1000 });
    expect(data).toEqual({ elements: [1, 2] });
  });

  test("rethrows parse failures untouched for callers to classify", async () => {
    const bad = new Response("not json {{{", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    let caught: unknown = null;
    try {
      await readJsonBody(bad, { timeoutMs: 1000 });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SyntaxError);
  });

  test("a stalled body times out instead of hanging forever", async () => {
    const controller = new AbortController();
    let caught: unknown = null;
    try {
      await readJsonBody(stalledResponse(), { signal: controller.signal, timeoutMs: 50 });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).kind).toBe("timeout");
  });

  test("caller aborts surface as raw AbortError for existing abort handling", async () => {
    const controller = new AbortController();
    const pending = readJsonBody(stalledResponse(), {
      signal: controller.signal,
      timeoutMs: 5000,
    });
    controller.abort();
    let caught: unknown = null;
    try {
      await pending;
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DOMException);
    expect((caught as DOMException).name).toBe("AbortError");
  });

  test("pre-aborted signals reject without reading", async () => {
    const controller = new AbortController();
    controller.abort();
    let caught: unknown = null;
    try {
      await readJsonBody(jsonResponse({}), { signal: controller.signal, timeoutMs: 1000 });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DOMException);
  });
});
