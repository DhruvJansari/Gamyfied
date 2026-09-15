import { redis } from "../../config/redis";
import { randomToken, sha256 } from "../../lib/crypto";
import { AppError, ErrorCode } from "../../lib/errors";
import type { Role } from "../../generated/prisma/enums";
import { usersRepository, type User } from "../users/users.repository";
import { sessionsRepository, type Session } from "./sessions.repository";
import { ACCESS_TTL_SEC, REFRESH_ABSOLUTE_MAX_SEC, REFRESH_TTL_SEC, signAccessToken } from "./tokens";

export type IssuedTokens = { accessToken: string; refreshToken: string; sessionId: string };

type Client = { ip: string | null; userAgent: string | null };

const revokedKey = (sid: string) => `revoked:${sid}`;
const REUSE_GRACE_MS = 10_000;

function slideExpiry(session: Pick<Session, "createdAt">): Date {
  const slid = Date.now() + REFRESH_TTL_SEC * 1000;
  const cap = session.createdAt.getTime() + REFRESH_ABSOLUTE_MAX_SEC * 1000;
  return new Date(Math.min(slid, cap));
}

/** Access tokens live 30 min; a revoked sid only needs to be remembered that long. */
async function denylist(sids: string[]): Promise<void> {
  if (sids.length === 0) return;
  const pipe = redis.pipeline();
  for (const sid of sids) pipe.set(revokedKey(sid), "1", "EX", ACCESS_TTL_SEC);
  await pipe.exec();
}

const signInAgain = () => AppError.unauthenticated(ErrorCode.REFRESH_INVALID, "Please sign in again");

export const sessionsService = {
  /** Called by every login path once the user is known. */
  async issueSession(user: { id: string; role: Role }, client: Client): Promise<IssuedTokens> {
    const refreshToken = randomToken();
    const session = await sessionsRepository.create({
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
      ip: client.ip,
      userAgent: client.userAgent?.slice(0, 255) ?? null,
    });
    const accessToken = signAccessToken({ sub: user.id, sid: session.id, role: user.role });
    return { accessToken, refreshToken, sessionId: session.id };
  },

  /**
   * Rotate a refresh token. Presenting an already-rotated token means it was stolen (or
   * replayed), so the whole session is revoked — the legitimate user just signs in again.
   * Cost: two reads + one write, once per access-token lifetime per active user.
   */
  async refreshSession(presented: string, client: Client): Promise<IssuedTokens & { user: User }> {
    const hash = sha256(presented);
    const current = await sessionsRepository.findByRefreshTokenHash(hash);

    if (!current) {
      const replayed = await sessionsRepository.findByPreviousTokenHash(hash);
      // Two tabs refreshing in the same instant both carry the old token; the second one
      // is a race, not a thief. Anything older than the grace window is treated as theft.
      const isRace = replayed?.rotatedAt && Date.now() - replayed.rotatedAt.getTime() < REUSE_GRACE_MS;
      if (replayed && !replayed.revokedAt) {
        if (isRace) {
          // The other tab already holds the new cookies; the caller must not clear them.
          throw new AppError(409, ErrorCode.REFRESH_RACE, "Session was just refreshed elsewhere");
        }
        console.warn(`[auth] refresh token reuse detected sid=${replayed.id} user=${replayed.userId} ip=${client.ip}`);
        await sessionsRepository.revoke(replayed.id, "reuse_detected");
        await denylist([replayed.id]);
      }
      throw signInAgain();
    }

    if (current.revokedAt || current.expiresAt.getTime() < Date.now()) {
      throw signInAgain();
    }

    const user = await usersRepository.findById(current.userId);
    if (!user) throw signInAgain();

    const refreshToken = randomToken();
    const rotated = await sessionsRepository.rotate(current.id, {
      newHash: sha256(refreshToken),
      previousHash: hash,
      expiresAt: slideExpiry(current),
    });
    const accessToken = signAccessToken({ sub: user.id, sid: rotated.id, role: user.role });
    return { accessToken, refreshToken, sessionId: rotated.id, user };
  },

  async revokeSession(sid: string, reason: "logout"): Promise<void> {
    await sessionsRepository.revoke(sid, reason);
    await denylist([sid]);
  },

  /** Logout when the access token has already expired but the refresh cookie is still there. */
  async revokeByRefreshToken(presented: string): Promise<void> {
    const session = await sessionsRepository.findByRefreshTokenHash(sha256(presented));
    if (session && !session.revokedAt) await this.revokeSession(session.id, "logout");
  },

  async revokeAllSessions(userId: string, reason: "logout_all" | "role_change", exceptSid?: string): Promise<void> {
    const sids = await sessionsRepository.revokeAllForUser(userId, reason, exceptSid);
    await denylist(sids);
  },

  /** One Redis GET per authenticated request; the only per-request auth I/O. */
  async isRevoked(sid: string): Promise<boolean> {
    return (await redis.exists(revokedKey(sid))) === 1;
  },
};
