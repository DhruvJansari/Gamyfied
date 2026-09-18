import { randomInt } from "node:crypto";

import { Prisma } from "../../generated/prisma/client";
import { encrypt } from "../../lib/crypto";
import { AppError, ErrorCode } from "../../lib/errors";
import { generatePublicId } from "../../lib/public-id";
import { profilesService } from "../profiles/profiles.service";
import { scoringService } from "../scoring/scoring.service";
import { socialLinksService } from "../social-links/social-links.service";
import { usersRepository, type CreateUserInput, type User } from "../users/users.repository";
import { usersService } from "../users/users.service";
import type { SendOtpInput, VerifyOtpInput } from "./auth.schemas";
import type { OAuthProfile } from "./oauth";
import { otpService, type PendingProfile } from "./otp.service";
import { sessionsService, type IssuedTokens } from "./sessions.service";

type Client = { ip: string | null; userAgent: string | null };

export type SignInResult = { user: User; tokens: IssuedTokens; isNewUser: boolean };

const isUniqueViolation = (err: unknown): err is Prisma.PrismaClientKnownRequestError =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

function slugifyHandle(source: string): string {
  const slug = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug.length >= 3 ? slug : `dev-${slug}`.slice(0, 24);
}

const suffix = () => randomInt(1000, 9999).toString();

/**
 * Creates the user row, retrying on the two unique columns we generate ourselves.
 * publicId collisions are astronomically rare; handle collisions are ordinary.
 */
async function createUser(input: Omit<CreateUserInput, "publicId" | "handle">, handleHint: string): Promise<User> {
  const base = slugifyHandle(handleHint);
  let handle = base;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await usersRepository.create({ ...input, publicId: generatePublicId(), handle });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const target = (err.meta?.target as string[] | string | undefined) ?? "";
      if (String(target).includes("email")) {
        throw AppError.conflict(ErrorCode.ACCOUNT_EXISTS, "An account with this email already exists");
      }
      if (String(target).includes("phone")) {
        throw AppError.conflict(ErrorCode.ACCOUNT_EXISTS, "An account with this phone number already exists");
      }
      // publicId or handle collided: new random values and go again.
      handle = `${base.slice(0, 19)}-${suffix()}`;
    }
  }
  throw new AppError(500, ErrorCode.INTERNAL, "Could not allocate a unique handle");
}

export const authService = {
  /** Step 1 of passwordless sign-in / sign-up: send a code to the email or phone. */
  async requestCode(input: SendOtpInput): Promise<void> {
    // Sign-in for an unknown identifier still "sends" (to the address given) so the
    // response never reveals whether an account exists. Verify is where it is resolved.
    const profile: PendingProfile | undefined = input.intent === "signup" && input.profile ? { ...input.profile } : undefined;
    await otpService.sendCode(input.channel, input.identifier, profile);
  },

  /** Step 2: prove ownership of the identifier, then sign in or create the account. */
  async verifyCodeAndSignIn(input: VerifyOtpInput, client: Client): Promise<SignInResult> {
    const { profile } = await otpService.verifyCode(input.channel, input.identifier, input.code);

    const existing =
      input.channel === "email"
        ? await usersRepository.findByEmail(input.identifier)
        : await usersRepository.findByPhone(input.identifier);

    let user: User;
    let isNewUser = false;

    if (existing) {
      user = existing;
      // First successful OTP on a channel verifies it.
      if (input.channel === "email" && !user.emailVerifiedAt) {
        user = await usersRepository.markEmailVerified(user.id);
        await usersService.invalidateMe(user.id);
      }
      if (input.channel === "phone" && !user.phoneVerifiedAt) {
        user = await usersRepository.markPhoneVerified(user.id);
        await usersService.invalidateMe(user.id);
      }
    } else {
      if (!profile) {
        // Code was valid but there is no account and no sign-up data: the frontend sends
        // them to sign-up with the identifier pre-filled (they already proved they own it).
        throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "No account for that yet — create one");
      }
      const now = new Date();
      const email = input.channel === "email" ? input.identifier : profile.email!;
      const phone = input.channel === "phone" ? input.identifier : (profile.phone ?? null);
      user = await createUser(
        {
          email,
          emailVerifiedAt: input.channel === "email" ? now : null,
          phone,
          phoneVerifiedAt: input.channel === "phone" ? now : null,
          displayName: profile.displayName,
        },
        profile.displayName,
      );
      isNewUser = true;
    }

    const tokens = await sessionsService.issueSession(user, client);
    return { user, tokens, isNewUser };
  },

  /** OAuth callback: find by provider account, else link by verified email, else create. */
  async signInWithProvider(profile: OAuthProfile, client: Client): Promise<SignInResult> {
    let user = await usersRepository.findByProviderAccount(profile.provider, profile.providerAccountId);
    let isNewUser = false;

    if (!user) {
      // Linking by email is only safe because both providers return verified emails
      // (checked in oauth.ts). An unverified provider email would be an account takeover.
      user = await usersRepository.findByEmail(profile.email);
      if (!user) {
        user = await createUser(
          {
            email: profile.email,
            emailVerifiedAt: new Date(),
            phone: null,
            phoneVerifiedAt: null,
            displayName: profile.displayName,
          },
          profile.handleHint ?? profile.displayName,
        );
        isNewUser = true;
      } else if (!user.emailVerifiedAt) {
        user = await usersRepository.markEmailVerified(user.id);
        await usersService.invalidateMe(user.id);
      }
    }

    const account = await usersRepository.linkProviderAccount({
      userId: user.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      accessTokenEnc: profile.accessToken ? encrypt(profile.accessToken) : null,
      scopes: profile.scopes || null,
      providerUsername: profile.username,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.profileUrl,
    });

    // The signed-in identity is the strongest evidence we have: it becomes (or upgrades) the
    // LINKED social link for that platform, fills an empty avatar, and the score follows.
    await Promise.all([
      socialLinksService.upsertLinkedFromAccount(user.id, account),
      profilesService.seedAvatar(user.id, account.avatarUrl),
    ]);
    await scoringService.recomputeProfileScore(user.id);

    const tokens = await sessionsService.issueSession(user, client);
    return { user, tokens, isNewUser };
  },

  refresh(refreshToken: string, client: Client) {
    return sessionsService.refreshSession(refreshToken, client);
  },

  async logout(sid: string | null, refreshToken: string | null): Promise<void> {
    if (sid) await sessionsService.revokeSession(sid, "logout");
    else if (refreshToken) await sessionsService.revokeByRefreshToken(refreshToken);
  },

  logoutAll(userId: string): Promise<void> {
    return sessionsService.revokeAllSessions(userId, "logout_all");
  },
};
