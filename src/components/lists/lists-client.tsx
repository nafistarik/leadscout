"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, ListPlus, Pencil, Trash2, Users } from "lucide-react";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { TextInput } from "@/components/ui/field";
import { SAMPLE_LIST, getLeadById } from "@/data/demo-leads";
import { useLeadLists } from "@/hooks/use-lead-lists";
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

function UserListRow({
  list,
  onRename,
  onDelete,
}: {
  list: LeadList;
  onRename: (id: string, name: string) => { ok: boolean; error?: string };
  onDelete: (id: string) => void;
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
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {editing ? (
        <form onSubmit={handleRename} className="space-y-3">
          <label htmlFor={`rename-${list.id}`} className="block text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
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
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
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
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Delete “{list.name}”?
          </p>
          <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-400">
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{list.name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
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
      )}
    </li>
  );
}

export default function ListsClient() {
  const { lists, createList, renameList, deleteList } = useLeadLists();
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
        <h2 id="lists-heading" className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Lists
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Organize leads into named lists. In this version lists are stored only in this browser and
          assigning leads to lists arrives in a later part — new lists start empty.
        </p>
      </section>

      <section aria-labelledby="create-list-heading">
        <Card>
          <CardBody>
            <h3 id="create-list-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
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
                  <p id="new-list-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
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
        <h3 id="sample-list-heading" className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Sample list
        </h3>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{SAMPLE_LIST.name}</p>
            <DemoBadge label="Sample · read-only" />
          </div>
          <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-400">
            Illustrative example only — {SAMPLE_LIST.leadIds.length} sample records
            {sampleLeadNames.length > 0 ? `: ${sampleLeadNames.join(", ")}` : ""}. It cannot be
            renamed or deleted and is not stored in your browser.
          </p>
        </div>
      </section>

      <section aria-labelledby="your-lists-heading">
        <h3 id="your-lists-heading" className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
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
              <UserListRow key={list.id} list={list} onRename={renameList} onDelete={deleteList} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
