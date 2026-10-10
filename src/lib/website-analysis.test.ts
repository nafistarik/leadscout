import { describe, expect, test } from "bun:test";
import { analyzeHtml, findCopyrightYear, unreachableAnalysis, websiteVerdict } from "@/lib/website-analysis";

const NOW = new Date("2026-10-11T00:00:00Z");

const MODERN = `<!doctype html><html><head>
<title>Bean There Café — Dhaka</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Specialty coffee in Malibagh.">
</head><body>
<h1>Welcome</h1><p>${"Great coffee and pastries every day. ".repeat(20)}</p>
<a href="mailto:hello@beanthere.example?subject=Hi">Email us</a>
<a href="tel:+8801711000000">Call</a>
<a href="https://www.facebook.com/beanthere">Facebook</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=x">Share</a>
<a href="https://instagram.com/">Instagram home</a>
<footer>© 2020 – 2026 Bean There</footer>
</body></html>`;

const DATED = `<html><head><title>Rahman Dental</title>
<meta name="generator" content="WordPress 4.9.8">
<script src="/wp-includes/js/jquery/jquery.js?ver=1.12.4"></script>
<script src="https://code.jquery.com/jquery-1.8.3.min.js"></script>
</head><body><center><font size="4">Welcome to our clinic</font></center>
<p>${"We provide dental care for the whole family. ".repeat(15)}</p>
<p>Contact: info&#64;rahman.example or rahmandental@gmail.com</p>
<p>Copyright &copy; 2017 Rahman Dental. All rights reserved.</p></body></html>`;

describe("analyzeHtml", () => {
  test("a modern homepage passes the basic checks and yields its contacts", () => {
    const analysis = analyzeHtml({ html: MODERN, url: "https://beanthere.example/", httpStatus: 200, now: NOW });
    expect(analysis.status).toBe("ok");
    expect(analysis.https).toBe("yes");
    expect(analysis.mobileFriendly).toBe(true);
    expect(analysis.copyrightYear).toBe(2026);
    expect(analysis.title).toBe("Bean There Café — Dhaka");
    expect(analysis.emails).toEqual(["hello@beanthere.example"]);
    expect(analysis.phones).toEqual(["+8801711000000"]);
    // Share links and bare network homepages are not profiles.
    expect(analysis.socials).toEqual([{ network: "facebook", url: "https://www.facebook.com/beanthere" }]);
    expect(analysis.issues).toHaveLength(0);
    expect(websiteVerdict(analysis)).toBe("modern");
  });

  test("a dated site is flagged with concrete, labeled reasons", () => {
    const analysis = analyzeHtml({ html: DATED, url: "http://rahman.example/", httpStatus: 200, now: NOW });
    const keys = analysis.issues.map((issue) => issue.key);
    expect(analysis.https).toBe("no");
    expect(analysis.mobileFriendly).toBe(false);
    expect(analysis.copyrightYear).toBe(2017);
    expect(analysis.platform).toBe("WordPress 4.9.8");
    expect(keys).toContain("no-https");
    expect(keys).toContain("not-mobile");
    expect(keys).toContain("stale-copyright");
    expect(analysis.legacySignals).toContain("WordPress 4.9.8 (pre-2018)");
    expect(analysis.legacySignals).toContain("jQuery 1.8.3");
    expect(analysis.legacySignals.some((s) => s.includes("<center>") && s.includes("<font>"))).toBe(true);
    expect(analysis.emails).toContain("rahmandental@gmail.com");
    expect(websiteVerdict(analysis)).toBe("outdated");
  });

  test("parked and error pages count as down", () => {
    const parked = analyzeHtml({
      html: "<html><head><title>example.com</title></head><body>This domain is for sale! Buy this domain today.</body></html>",
      url: "https://example.com/",
      httpStatus: 200,
      now: NOW,
    });
    expect(parked.status).toBe("parked");
    expect(websiteVerdict(parked)).toBe("down");
    const broken = analyzeHtml({ html: "<html><body>Not Found</body></html>", url: "https://x.example/", httpStatus: 404, now: NOW });
    expect(broken.status).toBe("error-page");
    expect(websiteVerdict(broken)).toBe("down");
  });

  test("unreachable sites carry the reason and a down verdict", () => {
    const analysis = unreachableAnalysis("https://gone.example/", "Domain does not exist (DNS lookup failed).", NOW);
    expect(analysis.https).toBe("unknown");
    expect(analysis.error).toContain("DNS");
    expect(websiteVerdict(analysis)).toBe("down");
  });

  test("ignores asset-like and placeholder emails", () => {
    const analysis = analyzeHtml({
      html: `<html><head><meta name="viewport" content="width=device-width"></head><body>logo@2x.png your@email.com sales@shop.example</body></html>`,
      url: "https://shop.example/",
      httpStatus: 200,
      now: NOW,
    });
    expect(analysis.emails).toEqual(["sales@shop.example"]);
  });
});

describe("findCopyrightYear", () => {
  test("takes the latest plausible year near a copyright marker", () => {
    expect(findCopyrightYear("© 2015-2019 Acme", NOW)).toBe(2019);
    expect(findCopyrightYear("Copyright 2024 Acme. Founded 1990.", NOW)).toBe(2024);
    expect(findCopyrightYear("Call 2017 2018 now", NOW)).toBeNull();
    expect(findCopyrightYear("© 2099", NOW)).toBeNull();
  });
});
