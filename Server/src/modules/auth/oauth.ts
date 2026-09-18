import { env } from "../../config/env";
import { redis } from "../../config/redis";
import { randomToken } from "../../lib/crypto";
import { AppError, ErrorCode } from "../../lib/errors";
import type { Provider } from "../../generated/prisma/enums";

export type OAuthProfile = {
  provider: Provider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  /** A handle suggestion from the provider (GitHub login), if any. */
  handleHint: string | null;
  /** Public identity at the provider — becomes the LINKED social link and seeds the avatar. */
  username: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  accessToken: string;
  scopes: string;
};

const STATE_TTL_SEC = 10 * 60;
const stateKey = (state: string) => `oauth:state:${state}`;

const redirectUri = (provider: Provider) => `${env.apiPublicUrl}/auth/${provider.toLowerCase()}/callback`;

// Plain OAuth 2.0 authorization-code flow with fetch. No passport: two providers, ~100 lines,
// and no framework to learn. Both providers send back the email they have verified.

const providers = {
  GITHUB: {
    enabled: () => env.oauth.github !== null,
    authorizeUrl(state: string): string {
      const p = new URLSearchParams({
        client_id: env.oauth.github!.clientId,
        redirect_uri: redirectUri("GITHUB"),
        scope: "read:user user:email",
        state,
      });
      return `https://github.com/login/oauth/authorize?${p}`;
    },
    async exchange(code: string): Promise<OAuthProfile> {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.oauth.github!.clientId,
          client_secret: env.oauth.github!.clientSecret,
          code,
          redirect_uri: redirectUri("GITHUB"),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const token = (await tokenRes.json()) as { access_token?: string; scope?: string; error?: string };
      if (!tokenRes.ok || !token.access_token) throw exchangeFailed("GITHUB", token.error);

      const gh = { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json" };
      const [userRes, emailsRes] = await Promise.all([
        fetch("https://api.github.com/user", { headers: gh, signal: AbortSignal.timeout(10_000) }),
        fetch("https://api.github.com/user/emails", { headers: gh, signal: AbortSignal.timeout(10_000) }),
      ]);
      if (!userRes.ok || !emailsRes.ok) throw exchangeFailed("GITHUB", "profile fetch");

      const user = (await userRes.json()) as {
        id: number;
        login: string;
        name: string | null;
        avatar_url: string | null;
        html_url: string | null;
      };
      const emails = (await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[];
      const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
      if (!primary) {
        throw AppError.badRequest(ErrorCode.OAUTH_EMAIL_UNVERIFIED, "Your GitHub account has no verified email");
      }

      return {
        provider: "GITHUB",
        providerAccountId: String(user.id),
        email: primary.email,
        emailVerified: true,
        displayName: user.name?.trim() || user.login,
        handleHint: user.login,
        username: user.login,
        avatarUrl: user.avatar_url || null,
        profileUrl: user.html_url || `https://github.com/${user.login}`,
        accessToken: token.access_token,
        scopes: token.scope ?? "",
      };
    },
  },

  GOOGLE: {
    enabled: () => env.oauth.google !== null,
    authorizeUrl(state: string): string {
      const p = new URLSearchParams({
        client_id: env.oauth.google!.clientId,
        redirect_uri: redirectUri("GOOGLE"),
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
    },
    async exchange(code: string): Promise<OAuthProfile> {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.oauth.google!.clientId,
          client_secret: env.oauth.google!.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri("GOOGLE"),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const token = (await tokenRes.json()) as { access_token?: string; scope?: string; error?: string };
      if (!tokenRes.ok || !token.access_token) throw exchangeFailed("GOOGLE", token.error);

      const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!infoRes.ok) throw exchangeFailed("GOOGLE", "userinfo");
      const info = (await infoRes.json()) as {
        sub: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
      };
      if (!info.email || !info.email_verified) {
        throw AppError.badRequest(ErrorCode.OAUTH_EMAIL_UNVERIFIED, "Your Google account email is not verified");
      }

      return {
        provider: "GOOGLE",
        providerAccountId: info.sub,
        email: info.email,
        emailVerified: true,
        displayName: info.name?.trim() || info.email.split("@")[0]!,
        handleHint: null,
        // Google is identity only, not a professional profile: no username / profile URL.
        username: null,
        avatarUrl: info.picture || null,
        profileUrl: null,
        // Google's token is not needed after sign-in; nothing to store.
        accessToken: "",
        scopes: token.scope ?? "",
      };
    },
  },
} as const;

function exchangeFailed(provider: Provider, detail?: string): AppError {
  console.error(`[oauth] ${provider} exchange failed: ${detail ?? "unknown"}`);
  return AppError.badRequest(ErrorCode.OAUTH_EXCHANGE_FAILED, "Sign-in with the provider failed, try again");
}

export const oauthService = {
  isEnabled(provider: Provider): boolean {
    return providers[provider].enabled();
  },

  /** Creates a one-time `state` (CSRF guard for the callback) and returns where to send the browser. */
  async beginAuthorization(provider: Provider, returnTo: string | null): Promise<string> {
    if (!providers[provider].enabled()) {
      throw AppError.badRequest(ErrorCode.OAUTH_PROVIDER_DISABLED, "That sign-in method is not available");
    }
    const state = randomToken(24);
    await redis.set(stateKey(state), JSON.stringify({ provider, returnTo }), "EX", STATE_TTL_SEC);
    return providers[provider].authorizeUrl(state);
  },

  /** Validates + consumes `state`, then exchanges the code for a normalized profile. */
  async completeAuthorization(provider: Provider, code: string, state: string): Promise<{ profile: OAuthProfile; returnTo: string | null }> {
    const raw = await redis.getdel(stateKey(state));
    const saved = raw ? (JSON.parse(raw) as { provider: Provider; returnTo: string | null }) : null;
    if (!saved || saved.provider !== provider) {
      throw AppError.badRequest(ErrorCode.OAUTH_STATE_INVALID, "That sign-in link has expired, start again");
    }
    const profile = await providers[provider].exchange(code);
    return { profile, returnTo: saved.returnTo };
  },
};
