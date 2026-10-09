import { describe, expect, test } from "bun:test";
import {
  isPlausibleEmail,
  normalizeWebsiteUrl,
  phoneHref,
  websiteDisplayLabel,
} from "@/lib/links";

describe("normalizeWebsiteUrl", () => {
  test("keeps http/https URLs", () => {
    expect(normalizeWebsiteUrl("https://example.com/a?b=c")).toBe("https://example.com/a?b=c");
    expect(normalizeWebsiteUrl("HTTP://EXAMPLE.COM")).toBe("HTTP://EXAMPLE.COM");
  });

  test("adds https:// to schemeless hosts", () => {
    expect(normalizeWebsiteUrl("example.org")).toBe("https://example.org");
    expect(normalizeWebsiteUrl("  example.org  ")).toBe("https://example.org");
  });

  test("blocks unsafe protocols even with case/whitespace tricks", () => {
    expect(normalizeWebsiteUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsiteUrl("JaVaScRiPt:alert(1)")).toBeNull();
    expect(normalizeWebsiteUrl("  javascript:alert(1)")).toBeNull();
    expect(normalizeWebsiteUrl("data:text/html,<h1>x</h1>")).toBeNull();
    expect(normalizeWebsiteUrl("vbscript:msgbox(1)")).toBeNull();
    expect(normalizeWebsiteUrl("file:///etc/passwd")).toBeNull();
    expect(normalizeWebsiteUrl("ftp://example.com")).toBeNull();
  });

  test("rejects malformed values", () => {
    expect(normalizeWebsiteUrl(null)).toBeNull();
    expect(normalizeWebsiteUrl("")).toBeNull();
    expect(normalizeWebsiteUrl("not a url")).toBeNull();
    expect(normalizeWebsiteUrl("x".repeat(3000))).toBeNull();
  });
});

describe("websiteDisplayLabel", () => {
  test("strips scheme and truncates", () => {
    expect(websiteDisplayLabel("https://example.com/")).toBe("example.com");
    expect(websiteDisplayLabel("https://example.com/" + "a".repeat(40))).toHaveLength(30);
  });
});

describe("phoneHref", () => {
  test("builds tel: targets and rejects unusable input", () => {
    expect(phoneHref("+49 30 123 456")).toBe("tel:+4930123456");
    expect(phoneHref("ab")).toBeNull();
    expect(phoneHref(null)).toBeNull();
  });
});

describe("isPlausibleEmail", () => {
  test("accepts ordinary addresses and rejects junk", () => {
    expect(isPlausibleEmail("shop@example.com")).toBe(true);
    expect(isPlausibleEmail(" a@b.co ")).toBe(true);
    expect(isPlausibleEmail("no-at-sign")).toBe(false);
    expect(isPlausibleEmail("a@b")).toBe(false);
    expect(isPlausibleEmail("a@@b.com")).toBe(false);
    expect(isPlausibleEmail("<a@b.com>")).toBe(false);
    expect(isPlausibleEmail(null)).toBe(false);
  });
});
