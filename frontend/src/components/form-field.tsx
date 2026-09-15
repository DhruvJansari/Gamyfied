import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  /** Inline validation message shown under the field. */
  error?: string;
  hint?: string;
};

/** Label + input + inline error. Same shape on every form, so the tokens stay in one place. */
export function FormField({ label, name, error, hint, className, ...input }: Props) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-ink">
        {label}
        {hint ? <span className="text-muted"> · {hint}</span> : null}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`h-12 w-full rounded-sm border bg-canvas px-4 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-info-border ${
          error ? "border-signature-coral" : "border-border-strong"
        } ${className ?? ""}`}
        {...input}
      />
      {error ? (
        <small id={errorId} className="text-signature-coral">
          {error}
        </small>
      ) : null}
    </div>
  );
}

/** Form-level (non-field) failure. The user's input stays where it is. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-sm border border-signature-coral/40 bg-surface-soft px-4 py-3 text-base text-ink">
      {message}
    </p>
  );
}
