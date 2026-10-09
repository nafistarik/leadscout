"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, ListPlus, Pencil, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { TextInput } from "@/components/ui/field";
import { SAMPLE_LIST, getLeadById } from "@/data/demo-leads";
import { useLeadLists } from "@/hooks/use-lead-lists";
import { useLeadWorkflow } from "@/hooks/use-lead-workflow";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { resolveLeadDisplay } from "@/lib/saved-leads";
import { effectiveStatus } from "@/lib/workflow";
import { StatusBadge } from "@/components/workflow/lead-workflow-panel";
import type { SavedLeadRecord } from "@/types/company";
import type { LeadList } from "@/types/lead";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function MemberList({
  list,
  records,
  onAdd,
  onRemove,
}: {
  list: LeadList;
  records: SavedLeadRecord[];
  onAdd: (listId: string, leadId: string) => { ok: boolean; error?: string };
  onRemove: (listId: string, leadId: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const { getWorkflow } = useLeadWorkflow();

  const demoNameById = (demoId: string): string | undefined => getLeadById(demoId)?.companyName;
  const companyById = (companyId: string) => {
    const record = records.find((item) => item.id === companyId);
    return record && record.kind === "osm" ? record.company : undefined;
  };

  const members = list.leadIds.map((id) => resolveLeadDisplay(id, demoNameById, companyById));
  const candidates = records.filter((record) => !list.leadIds.includes(record.id));
  const candidateName = (record: SavedLeadRecord): string =>
    record.kind === "osm" ? record.company.name : (demoNameById(record.demoId) ?? record.demoId);

  function handleAdd() {
    if (!selected) {
      setFeedback("Choose a saved lead first.");
      return;
    }
    const result = onAdd(list.id, selected);
    if (!result.ok) {
      setFeedback(result.error ?? "Could not add to list.");
      return;
    }
    setFeedback("Lead added to the list.");
    setSelected("");
  }

  const selectId = `list-members-${list.id}`;

  return (
    <div className="mt-4 border-t border-line-soft pt-4">
      <h4 className="text-[13px] font-semibold text-ink">
        Members ({members.length})
      </h4>
      {members.length === 0 ? (
        <p className="mt-1 text-[13px] text-ink2">
          No leads in this list yet. Add one below.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {members.map((member) => (
            <li
              key={member.id}
              className="neu-recessed flex items-center justify-between gap-2 rounded-lg bg-recessed px-3 py-2 text-[13px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-ink">
                  {member.name}
                </span>
                {member.kind === "osm" ? (
                  <Badge tone="info">OSM</Badge>
                ) : member.kind === "demo" ? (
                  <Badge tone="demo">Sample</Badge>
                ) : (
                  <Badge tone="warning">Removed</Badge>
                )}
                {member.kind !== "missing" ? (
                  <StatusBadge status={effectiveStatus(getWorkflow(member.id))} />
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onRemove(list.id, member.id)}
                aria-label={`Remove ${member.name} from ${list.name}`}
                className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink3 hover:bg-recessed hover:text-status-error-fg"
              >
                <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {candidates.length > 0 ? (
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor={selectId} className="sr-only">
            Add a saved lead to {list.name}
          </label>
          <select
            id={selectId}
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setFeedback(null);
            }}
            className="neu-recessed h-9 min-w-0 flex-1 cursor-pointer rounded-lg border border-line-soft bg-recessed px-2 text-[13px] text-ink"
          >
            <option value="">Add a saved lead…</option>
            {candidates.map((record) => (
              <option key={record.id} value={record.id}>
                {candidateName(record)} ({record.kind === "osm" ? "OSM" : "Sample"})
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="secondary" onClick={handleAdd} disabled={!selected}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink3">
          {records.length === 0
            ? "Save leads first — then add them here."
            : "All saved leads are already in this list."}
        </p>
      )}
      {feedback ? (
        <p role="status" className="mt-1 text-xs text-ink3">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function UserListRow({
  list,
  records,
  onRename,
  onDelete,
  onAdd,
  onRemove,
}: {
  list: LeadList;
  records: SavedLeadRecord[];
  onRename: (id: string, name: string) => { ok: boolean; error?: string };
  onDelete: (id: string) => void;
  onAdd: (listId: string, leadId: string) => { ok: boolean; error?: string };
  onRemove: (listId: string, leadId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(list.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onRename(list.id, draft);
    if (!result.ok) {
      setError(result.error ?? "Could not rename list.");
      return;
    }
    setError(null);
    setEditing(false);
  }

  return (
    <li className="neu-raised rounded-xl border border-line-soft bg-raised p-4">
      {editing ? (
        <form onSubmit={handleRename} className="space-y-3">
          <label htmlFor={`rename-${list.id}`} className="block text-[13px] font-medium text-ink2">
            Rename list
          </label>
          <TextInput
            id={`rename-${list.id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={60}
            autoFocus
          />
          {error ? (
            <p role="alert" className="text-sm text-status-error-fg">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Save name
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setDraft(list.name);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : confirmingDelete ? (
        <div className="rounded-lg border border-status-error-line bg-status-error-bg p-4">
          <p className="text-sm font-medium text-status-error-fg">
            Delete “{list.name}”?
          </p>
          <p className="mt-1 text-[13px] text-status-error-fg opacity-90">
            This removes the list from this browser. Saved leads themselves are kept.
          </p>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" variant="danger" onClick={() => onDelete(list.id)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Yes, delete
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{list.name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink3">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {list.leadIds.length} lead{list.leadIds.length === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Created {formatDate(list.createdAt)}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)} aria-label={`Rename ${list.name}`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Rename
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete ${list.name}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
            </div>
          </div>
          <MemberList list={list} records={records} onAdd={onAdd} onRemove={onRemove} />
        </>
      )}
    </li>
  );
}

export default function ListsClient() {
  const { lists, createList, renameList, deleteList, addToList, removeFromList } = useLeadLists();
  const { records } = useSavedLeads();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createList(name);
    if (!result.ok) {
      setFormError(result.error ?? "Could not create list.");
      return;
    }
    setFormError(null);
    setName("");
  }

  const sampleLeadNames = SAMPLE_LIST.leadIds
    .map((id) => getLeadById(id)?.companyName)
    .filter((value): value is string => typeof value === "string");

  return (
    <div className="space-y-6">
      <section aria-labelledby="lists-heading">
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge label="Local-only lists" />
        </div>
        <h2 id="lists-heading" className="mt-2 text-xl font-bold tracking-tight text-ink">
          Lists
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink2">
          Organize saved leads into named lists — demo samples and real OpenStreetMap records can
          share a list. Lists are stored only in this browser.
        </p>
      </section>

      <section aria-labelledby="create-list-heading">
        <Card>
          <CardBody>
            <h3 id="create-list-heading" className="text-sm font-semibold text-ink">
              Create a new list
            </h3>
            <form onSubmit={handleCreate} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <label htmlFor="new-list-name" className="sr-only">
                  New list name
                </label>
                <TextInput
                  id="new-list-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Munich cafés to contact"
                  maxLength={60}
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={formError ? "new-list-error" : undefined}
                />
                {formError ? (
                  <p id="new-list-error" role="alert" className="mt-1 text-sm text-status-error-fg">
                    {formError}
                  </p>
                ) : null}
              </div>
              <Button type="submit">
                <ListPlus className="h-4 w-4" aria-hidden="true" />
                Create list
              </Button>
            </form>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="sample-list-heading">
        <h3 id="sample-list-heading" className="mb-3 text-sm font-semibold text-ink">
          Sample list
        </h3>
        <div className="rounded-xl border border-line-soft bg-raised p-4" style={{ borderStyle: "dashed" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{SAMPLE_LIST.name}</p>
            <DemoBadge label="Sample · read-only" />
          </div>
          <p className="mt-1 text-[13px] text-ink2">
            Illustrative example only — {SAMPLE_LIST.leadIds.length} sample records
            {sampleLeadNames.length > 0 ? `: ${sampleLeadNames.join(", ")}` : ""}. It cannot be
            renamed or deleted and is not stored in your browser.
          </p>
        </div>
      </section>

      <section aria-labelledby="your-lists-heading">
        <h3 id="your-lists-heading" className="mb-3 text-sm font-semibold text-ink">
          Your lists ({lists.length})
        </h3>
        {lists.length === 0 ? (
          <EmptyState
            title="No lists yet"
            description="Create your first local list above. Names must be unique and are validated before saving."
            action={null}
          />
        ) : (
          <ul className="space-y-3">
            {lists.map((list) => (
              <UserListRow
                key={list.id}
                list={list}
                records={records}
                onRename={renameList}
                onDelete={deleteList}
                onAdd={addToList}
                onRemove={removeFromList}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
