import { describe, expect, test } from "bun:test";
import { describeOsmDetails } from "@/lib/osm-details";
import { buildPitch, mailtoLink, pitchLanguageFor, sanitizeSignature, whatsappLink } from "@/lib/pitch";
import type { WebsiteAnalysis } from "@/lib/website-analysis";
import type { Company } from "@/types/company";

function company(extra: Partial<Company> = {}, tags: Record<string, string> = {}): Company {
  return {
    id: "overture:1",
    provenance: "overture",
    name: "Smile Dental",
    category: "Dental Clinic",
    city: "London",
    country: "United Kingdom",
    locationLabel: "London, United Kingdom",
    lat: 51.5,
    lon: -0.1,
    website: null,
    phone: null,
    email: null,
    openingHours: null,
    source: "Overture Maps",
    sourceUrl: null,
    tags: { name: "Smile Dental", ...tags },
    ...extra,
  };
}

function analysis(issues: WebsiteAnalysis["issues"], copyrightYear: number | null = null): WebsiteAnalysis {
  return {
    url: "https://smile.example",
    analyzedAt: "2026-11-08T10:00:00.000Z",
    status: "ok",
    httpStatus: 200,
    https: "yes",
    mobileFriendly: true,
    copyrightYear,
    title: "Smile",
    description: null,
    platform: null,
    legacySignals: [],
    emails: [],
    phones: [],
    socials: [],
    textLength: 1000,
    issues,
    error: null,
  };
}

const SIGNED = { name: "Nafis", link: "https://nafis.example" };

describe("sanitizeSignature", () => {
  test("trims and keeps an http(s) link", () => {
    expect(sanitizeSignature({ name: "  Nafis ", link: " https://nafis.example " })).toEqual(SIGNED);
  });

  test("drops an unsafe or malformed link and non-string values", () => {
    expect(sanitizeSignature({ name: 3, link: "javascript:alert(1)" })).toEqual({ name: "", link: "" });
    expect(sanitizeSignature(null)).toEqual({ name: "", link: "" });
  });
});

describe("pitchLanguageFor", () => {
  test("Bangla for Bangladesh, by country name or code", () => {
    expect(pitchLanguageFor(company({ country: "Bangladesh" }), [])).toBe("bn");
    expect(pitchLanguageFor(company({ country: "BD" }), [])).toBe("bn");
  });

  test("a +880 number decides only when the country is unknown", () => {
    expect(pitchLanguageFor(company({ country: null }), ["+880 1711-000000"])).toBe("bn");
    expect(pitchLanguageFor(company(), ["+8801711000000"])).toBe("en");
    expect(pitchLanguageFor(company({ country: null }), [])).toBe("en");
  });
});

describe("buildPitch", () => {
  test("no website: says so, and signs with the saved name and link", () => {
    const lead = company();
    const pitch = buildPitch(lead, describeOsmDetails(lead), null, SIGNED, "en");
    expect(pitch.subject).toBe("A website for Smile Dental");
    expect(pitch.body).toContain("you don't have a website yet");
    expect(pitch.body.endsWith("Best regards,\nNafis\nhttps://nafis.example")).toBe(true);
  });

  test("social page only, in Bangla, with a placeholder when no name is saved", () => {
    const lead = company({ country: "Bangladesh" }, { "contact:facebook": "https://www.facebook.com/123" });
    const pitch = buildPitch(lead, describeOsmDetails(lead), null, { name: "", link: "" }, "bn");
    expect(pitch.body).toContain("Facebook/সোশ্যাল পেজ");
    expect(pitch.body.endsWith("ধন্যবাদ,\n[আপনার নাম]")).toBe(true);
  });

  test("website issues: majors first, duplicates merged, at most three", () => {
    const lead = company({ website: "https://smile.example" });
    const checked = analysis(
      [
        { key: "no-title", label: "", severity: "minor" },
        { key: "no-description", label: "", severity: "minor" },
        { key: "not-mobile", label: "", severity: "major" },
        { key: "stale-copyright", label: "", severity: "major" },
        { key: "thin", label: "", severity: "minor" },
      ],
      2019,
    );
    const body = buildPitch(lead, describeOsmDetails(lead), checked, SIGNED, "en").body;
    expect(body).toContain(
      "isn't built for phones, where most customers look; it looks like it hasn't been updated since 2019; it's hard to find on Google.",
    );
    expect(body).not.toContain("very little information");
  });

  test("an unchecked or clean website gets a neutral line", () => {
    const lead = company({ website: "https://smile.example" });
    expect(buildPitch(lead, describeOsmDetails(lead), null, SIGNED, "en").body).toContain("have a few ideas");
    expect(buildPitch(lead, describeOsmDetails(lead), analysis([]), SIGNED, "en").body).toContain("have a few ideas");
  });
});

describe("whatsappLink", () => {
  test("uses the international number and encodes the text", () => {
    expect(whatsappLink("+880 1711-000000", "Hi & bye")).toBe("https://wa.me/8801711000000?text=Hi%20%26%20bye");
    expect(whatsappLink("0044 20 7946 0000", "x")).toBe("https://wa.me/442079460000?text=x");
  });

  test("turns a Bangladeshi local mobile into +880", () => {
    expect(whatsappLink("01711-000000", "x")).toBe("https://wa.me/8801711000000?text=x");
  });

  test("refuses a local number without a country code, and junk", () => {
    expect(whatsappLink("020 7946 0000", "x")).toBeNull();
    expect(whatsappLink("+12", "x")).toBeNull();
  });
});

describe("mailtoLink", () => {
  test("fills subject and body, encoded", () => {
    expect(mailtoLink(" a@b.co ", { subject: "Hi there", body: "Line 1\nLine 2" })).toBe(
      "mailto:a@b.co?subject=Hi%20there&body=Line%201%0ALine%202",
    );
  });

  test("refuses an implausible address", () => {
    expect(mailtoLink("not an email", { subject: "", body: "" })).toBeNull();
  });
});
