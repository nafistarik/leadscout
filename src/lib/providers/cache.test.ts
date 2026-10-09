import { describe, expect, test } from "bun:test";
import { InflightDeduper, searchCacheKey, TtlCache } from "@/lib/providers/cache";

describe("searchCacheKey", () => {
  test("equivalent normalized filters share a key", () => {
    const a = searchCacheKey({ city: "Berlin", country: "Germany", category: "all", keyword: "", maxResults: 10 });
    const b = searchCacheKey({ city: "  BERLIN ", country: "germany", category: "all", keyword: "", maxResults: 10 });
    expect(a).toBe(b);
  });

  test("different parameters never share a key", () => {
    const base = { city: "Berlin", country: "Germany", category: "all", keyword: "", maxResults: 10 };
    const variants = [
      searchCacheKey({ ...base, city: "Munich" }),
      searchCacheKey({ ...base, country: "France" }),
      searchCacheKey({ ...base, category: "Bakery" }),
      searchCacheKey({ ...base, keyword: "x" }),
      searchCacheKey({ ...base, maxResults: 25 }),
    ];
    const baseKey = searchCacheKey(base);
    for (const key of variants) expect(key).not.toBe(baseKey);
    expect(new Set(variants).size).toBe(variants.length);
  });
});

describe("TtlCache", () => {
  test("returns entries before expiry and misses after", async () => {
    const cache = new TtlCache<string>(30);
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(cache.get("k")).toBeUndefined();
  });

  test("evicts oldest entries beyond the cap and refreshes on rewrite", () => {
    const cache = new TtlCache<string>(60_000, 2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
    // Rewriting an existing key refreshes it instead of evicting a neighbor.
    cache.set("b", "2b");
    cache.set("d", "4");
    expect(cache.get("b")).toBe("2b");
    expect(cache.get("c")).toBeUndefined();
    expect(cache.get("d")).toBe("4");
  });
});

describe("InflightDeduper", () => {
  test("shares one promise between simultaneous identical requests", async () => {
    const deduper = new InflightDeduper<string>();
    let starts = 0;
    const start = (): Promise<string> => {
      starts += 1;
      return new Promise((resolve) => setTimeout(() => resolve("done"), 20));
    };
    const [a, b] = await Promise.all([deduper.run("k", start), deduper.run("k", start)]);
    expect(a).toBe("done");
    expect(b).toBe("done");
    expect(starts).toBe(1);
  });

  test("failures are not cached: the next run starts fresh", async () => {
    const deduper = new InflightDeduper<string>();
    let calls = 0;
    const failing = (): Promise<string> => {
      calls += 1;
      return Promise.reject(new Error("boom"));
    };
    const attempt = async (): Promise<string | null> => {
      try {
        await deduper.run("k", failing);
        return null;
      } catch (error) {
        return (error as Error).message;
      }
    };
    expect(await attempt()).toBe("boom");
    expect(await attempt()).toBe("boom");
    expect(calls).toBe(2);
  });
});
