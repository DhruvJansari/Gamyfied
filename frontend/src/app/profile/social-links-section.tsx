"use client";

import { useState, type FormEvent } from "react";

import { FormError } from "@/components/form-field";
import { useAddSocialLink, useRemoveSocialLink } from "@/hooks/use-profile";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import { SUPPORTED_PLATFORM_LABELS, previewPlatform } from "@/lib/social-platforms";
import type { OwnerProfile } from "@/services/profiles";
import { SOCIAL_LINKS_MAX } from "@/services/social-links";

import { Points, PrimaryButton, Section, TrustChip } from "@/components/profile-ui";

export function SocialLinksSection({ profile }: { profile: OwnerProfile }) {
  const add = useAddSocialLink();
  const remove = useRemoveSocialLink();
  const [url, setUrl] = useState("");

  const links = profile.socialLinks;
  const items = profile.scoreBreakdown.sections.find((s) => s.key === "SOCIAL_IDENTITY")?.items ?? [];
  const pointsFor = (platform: string) => items.find((i) => i.key === platform);
  const preview = previewPlatform(url);
  const isFull = links.length >= SOCIAL_LINKS_MAX;
  const hasLinkedGithub = links.some((l) => l.platform === "GITHUB" && l.trustLevel === "LINKED");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    add.mutate(url, { onSuccess: () => setUrl("") });
  }

  const addError = add.error ? (isApiError(add.error) ? (add.error.fields.url ?? messageFor(add.error.code)) : messageFor(undefined)) : null;
  const removeError = remove.error ? messageFor(isApiError(remove.error) ? remove.error.code : undefined) : null;

  return (
    <Section
      id="identity"
      title="Professional identity"
      count={`${links.length} of ${SOCIAL_LINKS_MAX}`}
      hint="One profile completes this task. A typed link is a claim; signing in with the platform proves it's yours and is worth three times more."
    >
      {links.length === 0 ? (
        <p className="text-base text-muted">No profiles yet. Paste your GitHub, LinkedIn or LeetCode URL below.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {links.map((link) => {
            const item = pointsFor(link.platform);
            return (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-ink">
                    {link.label}
                    <TrustChip level={link.trustLevel} />
                  </span>
                  <a href={link.url} target="_blank" rel="noreferrer" className="truncate text-sm">
                    {link.url}
                  </a>
                  {item?.hint ? <small className="text-muted">{item.hint}</small> : null}
                </div>
                <div className="flex items-center gap-4">
                  {item ? <Points value={item.points} max={item.max} /> : null}
                  {link.isReadOnly ? (
                    <small className="text-muted">via sign-in</small>
                  ) : (
                    <button
                      type="button"
                      onClick={() => remove.mutate(link.id)}
                      disabled={remove.isPending}
                      className="text-sm text-muted underline-offset-4 hover:underline disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <FormError message={removeError} />

      {!hasLinkedGithub ? (
        <a
          href={endpoints.auth.oauthStart("github", "/profile")}
          className="flex items-center justify-between gap-4 rounded-md border border-hairline bg-canvas px-4 py-3 no-underline active:bg-surface-strong"
        >
          <span className="flex flex-col">
            <span className="text-ink">Connect GitHub</span>
            <small className="text-muted">Sign in with GitHub once and your GitHub profile becomes a linked, higher-scoring identity.</small>
          </span>
          <span aria-hidden className="text-muted">→</span>
        </a>
      ) : null}

      {!isFull ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
          <label htmlFor="social-url" className="text-ink">
            Add a profile URL
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="social-url"
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://github.com/you"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid={addError ? true : undefined}
              className={`h-11 flex-1 rounded-sm border bg-canvas px-4 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-info-border ${
                addError ? "border-signature-coral" : "border-border-strong"
              }`}
            />
            <PrimaryButton type="submit" disabled={add.isPending || !url.trim()}>
              {add.isPending ? "Adding…" : "Add"}
            </PrimaryButton>
          </div>
          <small className={preview ? "text-ink" : "text-muted"}>
            {url.trim() ? (preview ? `Looks like ${preview.label}` : "Not a supported platform") : `Supported: ${SUPPORTED_PLATFORM_LABELS.join(", ")}`}
          </small>
          <FormError message={addError} />
        </form>
      ) : (
        <small className="text-muted">You&apos;ve added the maximum of {SOCIAL_LINKS_MAX}. Remove one to add another.</small>
      )}
    </Section>
  );
}
