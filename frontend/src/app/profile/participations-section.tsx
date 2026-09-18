"use client";

import { useState, type FormEvent } from "react";

import { FormError, FormField } from "@/components/form-field";
import { useCreateParticipation, useRemoveParticipation, useUpdateParticipation, useVerifyParticipation } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import { PARTICIPATION_KINDS, PARTICIPATIONS_MAX, type Participation, type ParticipationInput, type ParticipationKind } from "@/services/participations";
import type { OwnerProfile, ScoreItem } from "@/services/profiles";

import { PARTICIPATION_KIND_LABEL as KIND_LABEL, Points, PrimaryButton, SecondaryButton, Section, Textarea, VerificationChip } from "@/components/profile-ui";

// The optional placement task. Nothing here is required, nothing here is penalised.
export function ParticipationsSection({ profile }: { profile: OwnerProfile }) {
  const entries = profile.participations;
  const [skipped, setSkipped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const items = profile.scoreBreakdown.sections.find((s) => s.key === "PARTICIPATION")?.items ?? [];
  const isFull = entries.length >= PARTICIPATIONS_MAX;

  if (skipped && entries.length === 0) {
    return (
      <div id="community" className="flex scroll-mt-24 items-center justify-between gap-4 rounded-lg border border-hairline px-5 py-3">
        <small className="text-muted">Community & collaboration — skipped. It never counts against you.</small>
        <button type="button" onClick={() => setSkipped(false)} className="text-sm text-link underline-offset-4 hover:underline">
          Add something
        </button>
      </div>
    );
  }

  return (
    <Section
      id="community"
      title="Community & collaboration"
      optional
      count={`${entries.length} of ${PARTICIPATIONS_MAX}`}
      hint="Hackathons, open source, meetups, freelance work. Add what you have — with a link if possible — or skip it. Skipping costs nothing."
      action={
        !adding && !isFull ? (
          <SecondaryButton onClick={() => setAdding(true)} className="h-10">
            Add
          </SecondaryButton>
        ) : undefined
      }
    >
      {adding ? <ParticipationForm onDone={() => setAdding(false)} /> : null}

      {entries.length === 0 && !adding ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-muted">Nothing here is fine. This task is optional.</p>
          <button type="button" onClick={() => setSkipped(true)} className="text-sm underline-offset-4 hover:underline">
            Skip for now
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) =>
            editingId === entry.id ? (
              <li key={entry.id}>
                <ParticipationForm entry={entry} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <ParticipationCard key={entry.id} entry={entry} item={items.find((i) => i.key === entry.id)} onEdit={() => setEditingId(entry.id)} />
            ),
          )}
        </ul>
      )}
    </Section>
  );
}

function ParticipationCard({ entry, item, onEdit }: { entry: Participation; item?: ScoreItem; onEdit: () => void }) {
  const remove = useRemoveParticipation();
  const verify = useVerifyParticipation();
  const canVerify = !!entry.url && entry.verificationStatus !== "VERIFICATION_PENDING" && entry.verificationStatus !== "VERIFIED";
  const error = remove.error ?? verify.error;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-hairline bg-canvas p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 text-ink">
            <small className="rounded-pill border border-hairline px-2 text-muted">{KIND_LABEL[entry.kind]}</small>
            {entry.title}
            {entry.year ? <small className="text-muted">{entry.year}</small> : null}
            <VerificationChip status={entry.verificationStatus} />
          </span>
          {entry.note ? <p className="text-base">{entry.note}</p> : null}
          {entry.url ? (
            <a href={entry.url} target="_blank" rel="noreferrer" className="truncate text-sm">
              {entry.url}
            </a>
          ) : null}
          {item?.hint ? <small className="text-muted">{item.hint}</small> : null}
        </div>
        {item ? <Points value={item.points} max={item.max} /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-3">
        <SecondaryButton onClick={() => verify.mutate(entry.id)} disabled={!canVerify || verify.isPending} title={!entry.url ? "Add a link first" : undefined} className="h-10">
          {verify.isPending ? "Requesting…" : "Verify"}
        </SecondaryButton>
        <button type="button" onClick={onEdit} className="text-sm underline-offset-4 hover:underline">
          Edit
        </button>
        <button type="button" onClick={() => remove.mutate(entry.id)} disabled={remove.isPending} className="text-sm text-muted underline-offset-4 hover:underline disabled:opacity-60">
          Remove
        </button>
      </div>
      <FormError message={error ? messageFor(isApiError(error) ? error.code : undefined) : null} />
    </li>
  );
}

function ParticipationForm({ entry, onDone }: { entry?: Participation; onDone: () => void }) {
  const create = useCreateParticipation();
  const update = useUpdateParticipation();
  const mutation = entry ? update : create;

  const [form, setForm] = useState({
    kind: entry?.kind ?? ("HACKATHON" as ParticipationKind),
    title: entry?.title ?? "",
    note: entry?.note ?? "",
    url: entry?.url ?? "",
    year: entry?.year ? String(entry.year) : "",
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input: ParticipationInput = {
      kind: form.kind,
      title: form.title,
      note: form.note.trim() || null,
      url: form.url.trim() || null,
      year: form.year.trim() ? Number(form.year) : null,
    };
    if (entry) update.mutate({ id: entry.id, input }, { onSuccess: onDone });
    else create.mutate(input, { onSuccess: onDone });
  }

  const fields = isApiError(mutation.error) ? mutation.error.fields : {};
  const formError = mutation.error && Object.keys(fields).length === 0 ? messageFor(isApiError(mutation.error) ? mutation.error.code : undefined) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-md border border-border-strong bg-canvas p-4 md:p-5">
      <h3 className="text-lg">{entry ? "Edit entry" : "New entry"}</h3>
      <div className="grid gap-5 md:grid-cols-[minmax(0,12rem)_1fr]">
        <div className="flex flex-col gap-2">
          <label htmlFor="kind" className="text-ink">
            Kind
          </label>
          <select
            id="kind"
            name="kind"
            value={form.kind}
            onChange={set("kind")}
            className="h-12 rounded-sm border border-border-strong bg-canvas px-3 text-ink focus:outline-none focus:ring-2 focus:ring-info-border"
          >
            {PARTICIPATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <FormField label="Title" name="title" placeholder="HackMIT 2025 — 2nd place" value={form.title} onChange={set("title")} maxLength={80} error={fields.title} autoFocus />
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_minmax(0,8rem)]">
        <FormField label="Link" name="url" hint="Devpost page, merged PR, event page…" type="url" placeholder="https://" value={form.url} onChange={set("url")} error={fields.url} />
        <FormField label="Year" name="year" hint="optional" type="number" inputMode="numeric" min={1990} max={new Date().getFullYear() + 1} value={form.year} onChange={set("year")} error={fields.year} />
      </div>
      <Textarea label="Note" name="note" hint="optional" placeholder="Your role, what you built, what came of it." value={form.note} onChange={set("note")} maxLength={500} error={fields.note} />
      <FormError message={formError} />
      <div className="flex gap-3 border-t border-hairline pt-5">
        <PrimaryButton type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : entry ? "Save" : "Add"}
        </PrimaryButton>
        <SecondaryButton onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
