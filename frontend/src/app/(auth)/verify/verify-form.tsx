"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { FormError, FormField } from "@/components/form-field";
import { useSendOtp, useVerifyOtp } from "@/hooks/use-auth";
import { ErrorCode, isApiError } from "@/lib/api/errors";
import { clearPendingSignup, readPendingSignup, safeReturnTo } from "@/lib/auth-flow";
import { messageFor } from "@/lib/messages";
import type { Channel } from "@/services/auth";

const RESEND_COOLDOWN_SEC = 60;

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const channel = (params.get("channel") === "phone" ? "phone" : "email") as Channel;
  const identifier = params.get("id") ?? "";
  const returnTo = safeReturnTo(params.get("returnTo"));

  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const verify = useVerifyOtp();
  const resend = useSendOtp();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Landing here without an identifier means the URL was hand-edited; send them back.
  useEffect(() => {
    if (!identifier) router.replace("/sign-in");
  }, [identifier, router]);

  function submit(value: string) {
    verify.mutate(
      { channel, identifier, code: value },
      {
        onSuccess: ({ isNewUser }) => {
          clearPendingSignup();
          router.replace(isNewUser ? "/onboarding" : returnTo);
        },
        onError: (err) => {
          if (isApiError(err) && err.code === ErrorCode.ACCOUNT_NOT_FOUND) {
            router.replace(`/sign-up?identifier=${encodeURIComponent(identifier)}&returnTo=${encodeURIComponent(returnTo)}`);
          }
        },
      },
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length === 6) submit(code);
  }

  function onCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    verify.reset();
    // Submit as soon as the sixth digit lands: one less thing to tap.
    if (digits.length === 6) submit(digits);
  }

  function onResend() {
    // A sign-up that is still pending must resend with its profile, or verify would
    // find no account and no profile.
    const pending = readPendingSignup(channel, identifier);
    resend.mutate(pending ?? { channel, identifier, intent: "signin" }, {
      onSuccess: () => {
        setCode("");
        verify.reset();
        setCooldown(RESEND_COOLDOWN_SEC);
      },
      onError: (err) => {
        if (isApiError(err) && err.retryAfterSec) setCooldown(err.retryAfterSec);
      },
    });
  }

  const verifyFieldError = isApiError(verify.error) ? verify.error.fields.code : undefined;
  const verifyFormError =
    verify.error && !verifyFieldError && !(isApiError(verify.error) && verify.error.code === ErrorCode.ACCOUNT_NOT_FOUND)
      ? messageFor(isApiError(verify.error) ? verify.error.code : undefined)
      : null;
  const resendError = resend.error ? messageFor(isApiError(resend.error) ? resend.error.code : undefined) : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1>Enter your code</h1>
        <p className="mt-2">
          We sent a 6-digit code to <span className="text-ink">{identifier}</span>.{" "}
          <Link href="/sign-in" className="text-ink underline underline-offset-4">
            Change
          </Link>
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          label="Code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          placeholder="••••••"
          className="text-center text-2xl tracking-[0.5em]"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          error={verifyFieldError}
        />
        <FormError message={verifyFormError ?? resendError} />
        <button
          type="submit"
          disabled={verify.isPending || code.length !== 6}
          className="h-12 rounded-lg bg-primary text-on-primary active:bg-primary-active disabled:opacity-60"
        >
          {verify.isPending ? "Checking…" : "Verify"}
        </button>
      </form>

      <small className="text-muted">
        Didn&apos;t get it?{" "}
        {cooldown > 0 ? (
          <span>Resend in 0:{String(cooldown).padStart(2, "0")}</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resend.isPending}
            className="text-ink underline underline-offset-4 disabled:opacity-60"
          >
            {resend.isPending ? "Sending…" : "Resend code"}
          </button>
        )}
        {" · "}Codes expire after 5 minutes.
      </small>
    </div>
  );
}
