"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { OAuthOptions } from "@/components/auth/oauth-options";
import { FormError, FormField } from "@/components/form-field";
import { useSendOtp } from "@/hooks/use-auth";
import { isApiError } from "@/lib/api/errors";
import { detectChannel, safeReturnTo, savePendingSignup, verifyPath, type PendingSignup } from "@/lib/auth-flow";
import { messageFor } from "@/lib/messages";

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  // Sign-in hands over here with the identifier they already proved they own.
  const prefill = params.get("identifier") ?? "";
  const prefillChannel = prefill ? detectChannel(prefill) : null;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(prefillChannel === "email" ? prefill : "");
  const [phone, setPhone] = useState(prefillChannel === "phone" ? prefill : "");
  const sendOtp = useSendOtp();

  const fields = isApiError(sendOtp.error) ? sendOtp.error.fields : {};
  const hasFieldError = Object.keys(fields).length > 0;
  const formError = sendOtp.error && !hasFieldError ? messageFor(isApiError(sendOtp.error) ? sendOtp.error.code : undefined) : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    const mail = email.trim();
    const tel = phone.trim();
    if (!name || !mail) return;

    // The code goes to the phone when they arrived via phone sign-in, otherwise to email.
    // Whichever channel is verified now; the other is stored and can be verified later.
    const input: PendingSignup =
      prefillChannel === "phone" && tel
        ? { channel: "phone", identifier: tel, intent: "signup", profile: { displayName: name, email: mail } }
        : { channel: "email", identifier: mail, intent: "signup", profile: { displayName: name, ...(tel ? { phone: tel } : {}) } };

    sendOtp.mutate(input, {
      onSuccess: () => {
        savePendingSignup(input);
        router.push(verifyPath(input.channel, input.identifier, returnTo));
      },
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1>Create an account</h1>
        <p className="mt-2">
          Already have one?{" "}
          <Link href="/sign-in" className="text-ink underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          label="Display name"
          name="displayName"
          type="text"
          autoComplete="name"
          autoFocus
          placeholder="What people will see on the leaderboard"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={fields["profile.displayName"]}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fields.identifier ?? fields["profile.email"]}
        />
        <FormField
          label="Phone number"
          hint="optional"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={fields["profile.phone"]}
        />
        <FormError message={formError} />
        <button
          type="submit"
          disabled={sendOtp.isPending || !displayName.trim() || !email.trim()}
          className="h-12 rounded-lg bg-primary text-on-primary active:bg-primary-active disabled:opacity-60"
        >
          {sendOtp.isPending ? "Sending code…" : "Create account"}
        </button>
        <small className="text-muted">
          You&apos;ll get a permanent ID like <span className="text-ink">#7K2M9QX</span> that never changes. Your name and handle can.
        </small>
      </form>

      <OAuthOptions returnTo={returnTo} />
    </div>
  );
}
