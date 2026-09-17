import type { Request, Response } from "express";

import { env } from "../../config/env";
import { AppError, ErrorCode } from "../../lib/errors";
import { clientIp, ok } from "../../lib/http";
import type { Provider } from "../../generated/prisma/enums";
import { validated } from "../../middleware/validate";
import { usersService } from "../users/users.service";
import type { SendOtpInput, VerifyOtpInput } from "./auth.schemas";
import { authService } from "./auth.service";
import { oauthService } from "./oauth";
import { clearAuthCookies, readRefreshCookie, setAuthCookies } from "./tokens";

const client = (req: Request) => ({ ip: clientIp(req), userAgent: req.get("user-agent") ?? null });

const PROVIDERS: Record<string, Provider> = { github: "GITHUB", google: "GOOGLE" };

function providerParam(req: Request): Provider {
  const provider = PROVIDERS[String(req.params.provider)];
  if (!provider) throw AppError.notFound("Unknown sign-in provider");
  return provider;
}

export const authController = {
  async sendOtp(req: Request, res: Response): Promise<void> {
    await authService.requestCode(validated<SendOtpInput>(req));
    ok(res, { sent: true });
  },

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const { user, tokens, isNewUser } = await authService.verifyCodeAndSignIn(validated<VerifyOtpInput>(req), client(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    ok(res, { user: await usersService.getMe(user.id), isNewUser });
  },

  async oauthStart(req: Request, res: Response): Promise<void> {
    const { returnTo } = validated<{ returnTo?: string }>(req, "query");
    const url = await oauthService.beginAuthorization(providerParam(req), returnTo ?? null);
    res.redirect(302, url);
  },

  /** Browser lands here from the provider; on any failure it is bounced to sign-in with a code. */
  async oauthCallback(req: Request, res: Response): Promise<void> {
    const provider = providerParam(req);
    try {
      const { code, state } = validated<{ code: string; state: string }>(req, "query");
      const { profile, returnTo } = await oauthService.completeAuthorization(provider, code, state);
      const { user, tokens, isNewUser } = await authService.signInWithProvider(profile, client(req));
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      res.redirect(302, `${env.frontendUrl}${isNewUser ? "/onboarding" : (returnTo ?? "/")}`);
    } catch (err) {
      const code = err instanceof AppError ? err.code : ErrorCode.OAUTH_EXCHANGE_FAILED;
      if (!(err instanceof AppError)) console.error("[oauth] callback failed", err);
      res.redirect(302, `${env.frontendUrl}/sign-in?error=${encodeURIComponent(code)}`);
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const presented = readRefreshCookie(req);
    if (!presented) throw AppError.unauthenticated(ErrorCode.REFRESH_INVALID, "Please sign in again");
    try {
      const { accessToken, refreshToken, user } = await authService.refresh(presented, client(req));
      setAuthCookies(res, accessToken, refreshToken);
      ok(res, { user: await usersService.getMe(user.id) });
    } catch (err) {
      if (!(err instanceof AppError && err.code === ErrorCode.REFRESH_RACE)) clearAuthCookies(res);
      throw err;
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.user?.sid ?? null, readRefreshCookie(req) ?? null);
    clearAuthCookies(res);
    ok(res, { signedOut: true });
  },

  async logoutAll(req: Request, res: Response): Promise<void> {
    await authService.logoutAll(req.user!.id);
    await usersService.invalidateMe(req.user!.id);
    clearAuthCookies(res);
    ok(res, { signedOut: true });
  },
};
