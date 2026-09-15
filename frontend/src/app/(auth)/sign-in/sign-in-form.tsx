"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { OAuthOptions } from "@/components/auth/oauth-options";
import { FormError, FormField } from "@/components/form-field";
import { useSendOtp } from "@/hooks/use-auth";
import { isApiError } from "@/lib/api/errors";
import { detectChannel, safeReturnTo, verifyPath } from "@/lib/auth-flow";
import { messageFor } from "@/lib/messages";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  // The OAuth callback bounces here with ?error=<code> when a provider sign-in fails.
  const oauthError = params.get("error");

  const [identifier, setIdentifier] = useState("");
  const sendOtp = useSendOtp();

  const fieldError = isApiError(sendOtp.error) ? sendOtp.error.fields.identifier : undefined;
  const formError = sendOtp.error && !fieldError ? messageFor(isApiError(sendOtp.error) ? sendOtp.error.code : undefined) : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    const channel = detectChannel(value);
    sendOtp.mutate(
      { channel, identifier: value, intent: "signin" },
      { onSuccess: () => router.push(verifyPath(channel, value, returnTo)) },
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1>Sign in</h1>
        <p className="mt-2">
          New here?{" "}
          <Link href="/sign-up" className="text-ink underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>

      {oauthError ? <FormError message={messageFor(oauthError)} /> : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          label="Email or phone number"
          name="identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoFocus
          placeholder="you@example.com or 98765 43210"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={fieldError}
        />
        <FormError message={formError} />
        <button
          type="submit"
          disabled={sendOtp.isPending || identifier.trim().length === 0}
          className="h-12 rounded-lg bg-primary text-on-primary active:bg-primary-active disabled:opacity-60"
        >
          {sendOtp.isPending ? "Sending code…" : "Continue"}
        </button>
        <small className="text-muted">We&apos;ll send a 6-digit code. No password needed.</small>
      </form>

      <OAuthOptions returnTo={returnTo} />
    </div>
  );
}
