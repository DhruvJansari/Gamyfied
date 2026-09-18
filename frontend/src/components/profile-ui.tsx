import type { ReactNode } from "react";

import type { ParticipationKind } from "@/services/participations";
import type { VerificationStatus } from "@/services/projects";
import type { TrustLevel } from "@/services/social-links";

/** UI copy for the backend's enum. Used on the owner page and the public page alike. */
export const PARTICIPATION_KIND_LABEL: Record<ParticipationKind, string> = {
  HACKATHON: "Hackathon",
  OPEN_SOURCE: "Open source",
  COMMUNITY: "Community",
  EVENT: "Event / talk",
  FREELANCE: "Freelance",
  COLLABORATION: "Collaboration",
  OTHER: "Other",
};

// Small pieces every section of the profile page shares: the same card frame, the same chip
// for a verification state, the same chip for a trust level. Same data, same logic, so they
// live once (project/Rules.md, Component reuse).

/** Photo if there is one, otherwise initials on the accent colour. */
export function Avatar({ url, name, size = "md" }: { url: string | null; name: string; size?: "md" | "lg" }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "?";
  const box = size === "lg" ? "size-24 text-3xl md:size-28 md:text-4xl" : "size-16 text-2xl";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote avatar hosts are not known ahead of time
    <img src={url} alt="" className={`${box} shrink-0 rounded-full border-4 border-surface-soft object-cover`} />
  ) : (
    <div aria-hidden className={`${box} flex shrink-0 items-center justify-center rounded-full border-4 border-surface-soft bg-accent text-on-dark`}>
      {initials}
    </div>
  );
}

export function Section({ id, title, count, hint, optional, action, children }: {
  id: string;
  title: string;
  /** e.g. "2 of 5" */
  count?: string;
  hint?: string;
  optional?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-5 rounded-lg border border-hairline bg-surface-soft p-5 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-3 text-xl md:text-2xl">
            {title}
            {optional ? <small className="rounded-pill border border-hairline px-2 text-muted">Optional</small> : null}
          </h2>
          {hint ? <small className="text-muted">{hint}</small> : null}
        </div>
        <div className="flex items-center gap-3">
          {count ? <small className="text-muted">{count}</small> : null}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

const VERIFICATION_CHIP: Record<VerificationStatus, { label: string; className: string }> = {
  NOT_VERIFIED: { label: "Not verified", className: "border-hairline text-muted" },
  VERIFICATION_PENDING: { label: "Queued for verification", className: "border-info-border text-info" },
  VERIFIED: { label: "Verified", className: "border-success-border text-success" },
  PARTIALLY_VERIFIED: { label: "Partially verified", className: "border-success-border text-success" },
  FAILED: { label: "Verification failed", className: "border-signature-coral/60 text-signature-coral" },
  INACCESSIBLE: { label: "Couldn't be accessed", className: "border-signature-coral/60 text-signature-coral" },
};

export function VerificationChip({ status }: { status: VerificationStatus }) {
  const chip = VERIFICATION_CHIP[status];
  return <small className={`rounded-pill border px-2.5 py-0.5 ${chip.className}`}>{chip.label}</small>;
}

const TRUST_CHIP: Record<TrustLevel, { label: string; className: string; title: string }> = {
  CLAIMED: { label: "Claimed", className: "border-hairline text-muted", title: "You typed this link. Sign in with the platform to prove it is yours." },
  LINKED: { label: "Linked", className: "border-success-border text-success", title: "Connected through sign-in — this account is yours." },
  VERIFIED: { label: "Verified", className: "border-success-border text-success", title: "Independently verified." },
};

export function TrustChip({ level }: { level: TrustLevel }) {
  const chip = TRUST_CHIP[level];
  return (
    <small title={chip.title} className={`rounded-pill border px-2.5 py-0.5 ${chip.className}`}>
      {chip.label}
    </small>
  );
}

/** "+15" style affordance next to optional fields, so filling more feels like a choice. */
export function Points({ value, max }: { value: number; max?: number }) {
  return (
    <small className="tabular-nums text-muted">
      {max !== undefined ? `${value} / ${max}` : `+${value}`}
    </small>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`h-11 rounded-lg bg-primary px-5 text-on-primary active:bg-primary-active disabled:opacity-60 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`h-11 rounded-lg border border-hairline bg-canvas px-4 text-ink active:bg-surface-strong disabled:opacity-60 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Textarea({ label, name, error, hint, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; error?: string; hint?: string }) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-ink">
        {label}
        {hint ? <span className="text-muted"> · {hint}</span> : null}
      </label>
      <textarea
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`min-h-28 w-full rounded-sm border bg-canvas px-4 py-3 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-info-border ${
          error ? "border-signature-coral" : "border-border-strong"
        }`}
        {...props}
      />
      {error ? (
        <small id={errorId} className="text-signature-coral">
          {error}
        </small>
      ) : null}
    </div>
  );
}
