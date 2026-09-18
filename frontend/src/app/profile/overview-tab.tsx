"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { FormError } from "@/components/form-field";
import { PrimaryButton, SecondaryButton } from "@/components/profile-ui";
import { useMe } from "@/hooks/use-auth";
import { useUpdateMyProfile, useUpdateStack } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import { STACK_MAX_ITEMS, STACK_TAG_MAX_LENGTH } from "@/services/onboarding";
import type { OwnerProfile } from "@/services/profiles";

// The basic-profile task as one editable sheet. Fields save together with the bar at the
// bottom, which only appears once something has changed. The photo field is what the
// pencil on the avatar jumps to.

export const PHOTO_FIELD_ID = "avatarUrl";

const HEADLINE_MIN = 10;
const BIO_MIN = 40;

type Draft = { headline: string; location: string; bio: string; websiteUrl: string; yearsOfExperience: string; avatarUrl: string };

function draftFrom(profile: OwnerProfile): Draft {
  const p = profile.profile;
  return {
    headline: p.headline ?? "",
    location: p.location ?? "",
    bio: p.bio ?? "",
    websiteUrl: (p.websiteUrl ?? "").replace(/^https:\/\//i, ""),
    yearsOfExperience: p.yearsOfExperience === null ? "" : String(p.yearsOfExperience),
    avatarUrl: p.avatarUrl ?? "",
  };
}

export function OverviewTab({ profile }: { profile: OwnerProfile }) {
  const update = useUpdateMyProfile();
  const saved = draftFrom(profile);
  const [draft, setDraft] = useState<Draft>(saved);
  const bioItem = profile.scoreBreakdown.sections.find((s) => s.key === "BASIC_PROFILE")?.items.find((i) => i.key === "bio");

  const dirty = !isEqual(draft, saved);
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate(
      {
        headline: draft.headline,
        location: draft.location,
        bio: draft.bio,
        websiteUrl: draft.websiteUrl.trim() ? `https://${draft.websiteUrl.trim().replace(/^https?:\/\//i, "")}` : "",
        yearsOfExperience: draft.yearsOfExperience.trim() === "" ? null : Number(draft.yearsOfExperience),
        avatarUrl: draft.avatarUrl,
      },
      { onSuccess: (fresh) => setDraft(draftFrom(fresh)) },
    );
  }

  const fields = isApiError(update.error) ? update.error.fields : {};
  const formError = update.error && Object.keys(fields).length === 0 ? messageFor(isApiError(update.error) ? update.error.code : undefined) : null;
  const bioLength = draft.bio.trim().length;
  const bioRemaining = bioItem ? bioItem.max - bioItem.points : 0;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col rounded-lg border border-hairline bg-surface-soft px-5 md:px-8">
      <Row title="Public headline" detail="Shown under your name everywhere.">
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <Field label="Headline" name="headline" error={fields.headline}>
            <input id="headline" name="headline" value={draft.headline} onChange={set("headline")} maxLength={120} placeholder="Backend engineer" className={inputClass(!!fields.headline)} />
          </Field>
          <Field label="Location" name="location" error={fields.location}>
            <input id="location" name="location" value={draft.location} onChange={set("location")} maxLength={80} placeholder="Ahmedabad" className={inputClass(!!fields.location)} />
          </Field>
        </div>
        {draft.headline.trim().length > 0 && draft.headline.trim().length < HEADLINE_MIN ? (
          <small className="text-muted">At least {HEADLINE_MIN} characters to count.</small>
        ) : null}
      </Row>

      <Row
        title="Bio"
        detail="A few lines about what you build."
        aside={
          bioItem ? (
            <small className={`w-fit rounded-pill px-3 py-1 tabular-nums ${bioRemaining > 0 ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"}`}>
              {bioItem.points}/{bioItem.max}
              {bioRemaining > 0 ? ` · +${bioRemaining} available` : " · full points"}
            </small>
          ) : null
        }
      >
        <Field label="" name="bio" error={fields.bio}>
          <textarea
            id="bio"
            name="bio"
            value={draft.bio}
            onChange={set("bio")}
            maxLength={2000}
            placeholder="What you build, what you care about, what you're looking for."
            className={`${inputClass(!!fields.bio)} min-h-40 resize-y py-3`}
          />
        </Field>
        <small className="text-muted">
          {bioLength} characters{bioLength < BIO_MIN ? ` · ${BIO_MIN} needed to complete the task` : bioItem?.hint ? ` · ${bioItem.hint.toLowerCase()}` : ""}
        </small>
      </Row>

      <Row title="Links & experience" detail="Your personal site and years in the field.">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="" name="websiteUrl" error={fields.websiteUrl}>
            <div className={`flex h-12 overflow-hidden rounded-sm border bg-canvas focus-within:ring-2 focus-within:ring-info-border ${fields.websiteUrl ? "border-signature-coral" : "border-border-strong"}`}>
              <span className="flex items-center border-r border-hairline bg-surface-strong/50 px-3 text-muted">https://</span>
              <input id="websiteUrl" name="websiteUrl" inputMode="url" value={draft.websiteUrl} onChange={set("websiteUrl")} maxLength={490} placeholder="www.yoursite.dev" aria-label="Personal website" className="min-w-0 flex-1 bg-transparent px-3 text-ink placeholder:text-muted focus:outline-none" />
            </div>
          </Field>
          <Field label="" name="yearsOfExperience" error={fields.yearsOfExperience}>
            <div className={`flex h-12 overflow-hidden rounded-sm border bg-canvas focus-within:ring-2 focus-within:ring-info-border ${fields.yearsOfExperience ? "border-signature-coral" : "border-border-strong"}`}>
              <input id="yearsOfExperience" name="yearsOfExperience" type="number" inputMode="numeric" min={0} max={60} value={draft.yearsOfExperience} onChange={set("yearsOfExperience")} placeholder="0" aria-label="Years of experience" className="min-w-0 flex-1 bg-transparent px-3 text-ink placeholder:text-muted focus:outline-none" />
              <span className="flex items-center pr-3 text-muted">years</span>
            </div>
          </Field>
        </div>
      </Row>

      <Row title="Photo" detail="A link to an image. Signing in with GitHub or Google fills this for you.">
        <Field label="" name={PHOTO_FIELD_ID} error={fields.avatarUrl}>
          <input id={PHOTO_FIELD_ID} name="avatarUrl" type="url" value={draft.avatarUrl} onChange={set("avatarUrl")} maxLength={500} placeholder="https://…/you.png" aria-label="Photo URL" className={inputClass(!!fields.avatarUrl)} />
        </Field>
      </Row>

      <StackRow profile={profile} />

      {dirty || update.error ? (
        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-hairline bg-surface-soft px-5 py-4 md:-mx-8 md:px-8">
          <PrimaryButton type="submit" disabled={update.isPending || !dirty}>
            {update.isPending ? "Saving…" : "Save changes"}
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              setDraft(saved);
              update.reset();
            }}
            disabled={update.isPending}
          >
            Discard
          </SecondaryButton>
          <FormError message={formError} />
        </div>
      ) : null}
    </form>
  );
}

/** Stack lives in onboarding, so it has its own tiny mutation and saves on each change. */
function StackRow({ profile }: { profile: OwnerProfile }) {
  const me = useMe();
  const update = useUpdateStack();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const stack = profile.stack;
  const onboarding = me.data?.onboarding ?? null;
  const isFull = stack.length >= STACK_MAX_ITEMS;

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function commit(next: string[]) {
    if (!onboarding) return;
    update.mutate({ current: onboarding, stack: next });
  }
  function add(raw: string) {
    const tag = raw.trim().slice(0, STACK_TAG_MAX_LENGTH);
    if (!tag || stack.some((t) => t.toLowerCase() === tag.toLowerCase()) || isFull) return;
    commit([...stack, tag]);
    setDraft("");
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Escape") {
      setAdding(false);
      setDraft("");
    }
  }

  return (
    <Row title="Stack" detail={`Tools you use day to day. Up to ${STACK_MAX_ITEMS}.`}>
      <div className="flex flex-wrap items-center gap-2">
        {stack.map((tag) => (
          <span key={tag} className="flex h-10 items-center gap-1.5 rounded-pill bg-surface-strong/60 pl-4 pr-2 text-ink">
            {tag}
            <button
              type="button"
              onClick={() => commit(stack.filter((t) => t !== tag))}
              disabled={update.isPending || !onboarding}
              aria-label={`Remove ${tag}`}
              className="flex size-6 items-center justify-center rounded-full text-muted active:bg-surface-strong disabled:opacity-50"
            >
              ×
            </button>
          </span>
        ))}
        {adding ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              add(draft);
              setAdding(false);
            }}
            maxLength={STACK_TAG_MAX_LENGTH}
            placeholder="Type, then Enter"
            aria-label="Add a technology"
            className="h-10 w-40 rounded-pill border border-border-strong bg-canvas px-4 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-info-border"
          />
        ) : !isFull && onboarding ? (
          <button type="button" onClick={() => setAdding(true)} disabled={update.isPending} className="h-10 rounded-pill border border-dashed border-border-strong px-4 text-muted active:bg-surface-strong disabled:opacity-50">
            + Add
          </button>
        ) : null}
      </div>
      <FormError message={update.error ? messageFor(isApiError(update.error) ? update.error.code : undefined) : null} />
    </Row>
  );
}

function Row({ title, detail, aside, children }: { title: string; detail: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-hairline py-7 last:border-b-0 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg md:text-xl">{title}</h2>
        <small className="text-muted">{detail}</small>
        {aside ? <div className="mt-1">{aside}</div> : null}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Field({ label, name, error, children }: { label: string; name: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label htmlFor={name} className="text-sm text-muted">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <small className="text-signature-coral">{error}</small> : null}
    </div>
  );
}

const inputClass = (invalid: boolean) =>
  `h-12 w-full rounded-sm border bg-canvas px-4 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-info-border ${invalid ? "border-signature-coral" : "border-border-strong"}`;

function isEqual(a: Draft, b: Draft): boolean {
  return (Object.keys(a) as (keyof Draft)[]).every((k) => a[k] === b[k]);
}
