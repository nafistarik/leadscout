"use client";

import { useState } from "react";
import { Contact, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCompanySummary, buildContactText, copyText } from "@/lib/clipboard";
import type { Company } from "@/types/company";

/**
 * Research copy actions for a single company row. Both actions run only
 * from these buttons (user-triggered, Clipboard API safe) and report
 * honest success/failure feedback — never a claimed success on failure.
 */
export function ResearchActions({ company }: { company: Company }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const contactText = buildContactText(company);

  async function handleCopy(kind: "summary" | "contact") {
    const text = kind === "summary" ? buildCompanySummary(company) : contactText;
    if (!text) return;
    setBusy(true);
    setStatus(null);
    const result = await copyText(text);
    setBusy(false);
    setStatus(
      result.ok
        ? kind === "summary"
          ? "Summary copied to clipboard."
          : "Contact details copied to clipboard."
        : (result.error ?? "Copy failed."),
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void handleCopy("summary")}
          aria-label={`Copy research summary for ${company.name}`}
          title="Copy name, category, location, contacts, and source"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Summary
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy || contactText === null}
          onClick={() => void handleCopy("contact")}
          aria-label={
            contactText === null
              ? `No contact details to copy for ${company.name}`
              : `Copy contact details for ${company.name}`
          }
          title={
            contactText === null
              ? "The source provides no contact details for this record"
              : "Copy available website, phone, and email"
          }
        >
          <Contact className="h-3.5 w-3.5" aria-hidden="true" />
          Contact
        </Button>
      </div>
      {status ? (
        <p role="status" className="text-[11px] text-ink3">
          {status}
        </p>
      ) : null}
    </div>
  );
}
