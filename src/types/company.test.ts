import { describe, expect, test } from "bun:test";
import { DEMO_LEADS } from "@/data/demo-leads";
import {
  isCompanyRecordId,
  isDemoRecordId,
  toDemoRecordId,
} from "@/types/company";

describe("saved-lead id namespaces", () => {
  test("demo and provider namespaces never overlap", () => {
    for (const lead of DEMO_LEADS) {
      expect(isCompanyRecordId(lead.id)).toBe(false);
      expect(isCompanyRecordId(toDemoRecordId(lead.id))).toBe(false);
      expect(isDemoRecordId(toDemoRecordId(lead.id))).toBe(true);
    }
    expect(isCompanyRecordId("osm:node/123")).toBe(true);
    expect(isDemoRecordId("osm:node/123")).toBe(false);
    expect(isDemoRecordId("demo-01")).toBe(false);
  });
});
