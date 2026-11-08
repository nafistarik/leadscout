"use client";

import { useState } from "react";
import { Copy, Mail, MessageCircle, Phone } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/button";
import { TextArea, TextInput } from "@/components/ui/field";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import { useWebsiteChecks } from "@/hooks/use-website-analysis";
import { phoneHref } from "@/lib/links";
import { describeOsmDetails } from "@/lib/osm-details";
import { buildPitch, mailtoLink, pitchLanguageFor, sanitizeSignature, whatsappLink } from "@/lib/pitch";
import type { PitchLanguage, PitchSignature } from "@/lib/pitch";
import { STORAGE_KEYS, cn } from "@/lib/storage";
import type { Company } from "@/types/company";

const EMPTY_SIGNATURE: PitchSignature = { name: "", link: "" };
const LANGUAGE_LABELS: Record<PitchLanguage, string> = { bn: "বাংলা", en: "English" };
const SECTION_LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink3";

/** Name and portfolio link, saved in this browser when each box loses focus. */
function SignatureFields({
  idPrefix,
  signature,
  onChange,
}: {
  idPrefix: string;
  signature: PitchSignature;
  onChange: (next: PitchSignature) => void;
}) {
  const [name, setName] = useState(signature.name);
  const [link, setLink] = useState(signature.link);
  // Take saved values (from this box's own save, another open lead or
  // another tab) without remounting, so focus stays where the user moved it.
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setName(signature.name);
    setLink(signature.link);
  }
  const save = () => onChange(sanitizeSignature({ name, link }));
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-sig-name`} className="mb-1 block text-[11px] font-medium text-ink2">
          Your name
        </label>
        <TextInput id={`${idPrefix}-sig-name`} value={name} onChange={(event) => setName(event.target.value)} onBlur={save} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-sig-link`} className="mb-1 block text-[11px] font-medium text-ink2">
          Portfolio link (https://…)
        </label>
        <TextInput
          id={`${idPrefix}-sig-link`}
          type="url"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onBlur={save}
          placeholder="https://"
        />
      </div>
    </div>
  );
}

/**
 * First-contact message for one saved lead with one-click WhatsApp, email
 * and copy. LeadScout cannot see whether a message was sent, so after a
 * channel opens it asks the user and only then records the contact.
 *
 * @param onContacted Called when the user confirms they sent the message.
 */
export function LeadPitchPanel({
  idPrefix,
  company,
  onContacted,
}: {
  idPrefix: string;
  company: Company;
  onContacted: () => void;
}) {
  const checks = useWebsiteChecks();
  const [signature, setSignature] = useLocalStorageValue(STORAGE_KEYS.pitchSignature, EMPTY_SIGNATURE, sanitizeSignature);
  const details = describeOsmDetails(company);
  const site = details.websiteKind === "site" ? company.website : null;
  const state = site ? checks.stateFor(site) : undefined;
  const analysis = state?.status === "done" ? state.analysis : null;
  const phones = [...new Set([...details.phones, ...(analysis?.phones ?? [])])];
  const emails = [...new Set([...details.emails, ...(analysis?.emails ?? [])])];
  const [language, setLanguage] = useState<PitchLanguage>(() => pitchLanguageFor(company, phones));
  const pitch = buildPitch(company, details, analysis, signature, language);
  const [draft, setDraft] = useState({ base: pitch.body, text: pitch.body });
  const [askSent, setAskSent] = useState(false);
  const [copyNote, setCopyNote] = useState<string | null>(null);

  // A new language, signature or website check rewrites the message;
  // until then the user's own edits are kept.
  const text = draft.base === pitch.body ? draft.text : pitch.body;
  if (draft.base !== pitch.body) setDraft({ base: pitch.body, text: pitch.body });

  const whatsapp = phones.map((phone) => whatsappLink(phone, text)).find((link) => link !== null) ?? null;
  // A landline cannot take WhatsApp; offer a call instead.
  const call = whatsapp ? null : (phones.map(phoneHref).find((link) => link !== null) ?? null);
  const email = emails.map((address) => mailtoLink(address, { subject: pitch.subject, body: text })).find(Boolean) ?? null;
  const messageId = `${idPrefix}-pitch`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote("Copied. Paste it wherever you contact them.");
      setAskSent(true);
    } catch {
      setCopyNote("Copy was blocked by the browser. Select the text and copy it by hand.");
    }
  }

  return (
    <section className="mb-4 space-y-3 border-b border-line-soft pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={messageId} className={cn(SECTION_LABEL, "mb-0")}>
          Pitch message
        </label>
        <div role="group" aria-label="Message language" className="flex gap-1">
          {(Object.keys(LANGUAGE_LABELS) as PitchLanguage[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={language === option}
              onClick={() => setLanguage(option)}
              className={cn(
                "cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-medium",
                language === option ? "border-transparent bg-accent text-on-accent" : "border-line-soft bg-raised text-ink2",
              )}
            >
              {LANGUAGE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {signature.name ? null : (
        <p className="text-[11px] text-status-warning-fg">Add your name once below; it will sign every message.</p>
      )}
      <SignatureFields idPrefix={idPrefix} signature={signature} onChange={setSignature} />

      <TextArea id={messageId} value={text} onChange={(event) => setDraft({ base: pitch.body, text: event.target.value })} rows={9} />
      {details.likelyWebsite ? (
        <p className="text-[11px] text-status-warning-fg">
          Their email suggests a website at {details.likelyWebsite.replace(/^https:\/\//, "")}. Open it before sending,
          and edit the message if it is already good.
        </p>
      ) : null}
      {site && !analysis ? (
        <p className="text-[11px] text-ink3">Run “Check site” first to mention what is wrong with their website.</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setAskSent(true)} className={buttonClassName("primary", "sm")}>
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            WhatsApp
          </a>
        ) : null}
        {call ? (
          <a href={call} onClick={() => setAskSent(true)} className={buttonClassName("secondary", "sm")}>
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Call
          </a>
        ) : null}
        {email ? (
          <a href={email} onClick={() => setAskSent(true)} className={buttonClassName("secondary", "sm")}>
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            Email
          </a>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy
        </Button>
        {!whatsapp && !call && !email ? (
          <span className="text-[11px] text-ink3">No phone or email known; copy the message instead.</span>
        ) : null}
      </div>
      {copyNote ? <p className="text-[11px] text-ink2">{copyNote}</p> : null}

      {askSent ? (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-status-info-bg p-2 text-xs text-status-info-fg">
          <span>Did you send it? LeadScout cannot see your WhatsApp or inbox.</span>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onContacted();
              setAskSent(false);
              setCopyNote(null);
            }}
          >
            Yes, mark as contacted
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAskSent(false)}>
            Not yet
          </Button>
        </div>
      ) : null}
    </section>
  );
}
