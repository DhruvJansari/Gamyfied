import { prisma } from "../../config/db";
import type { Session } from "../../generated/prisma/client";

export type { Session };

export const sessionsRepository = {
  create(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<Session> {
    return prisma.session.create({ data: input });
  },

  findByRefreshTokenHash(hash: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { refreshTokenHash: hash } });
  },

  findByPreviousTokenHash(hash: string): Promise<Session | null> {
    return prisma.session.findFirst({ where: { previousTokenHash: hash } });
  },

  /** Rotation: current hash moves to `previous`, new hash becomes current, expiry slides. */
  rotate(id: string, input: { newHash: string; previousHash: string; expiresAt: Date }): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: {
        refreshTokenHash: input.newHash,
        previousTokenHash: input.previousHash,
        rotatedAt: new Date(),
        expiresAt: input.expiresAt,
        lastUsedAt: new Date(),
      },
    });
  },

  revoke(id: string, reason: string): Promise<void> {
    return prisma.session
      .updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } })
      .then(() => undefined);
  },

  /** Returns the ids revoked so the caller can denylist their access tokens. */
  async revokeAllForUser(userId: string, reason: string, exceptId?: string): Promise<string[]> {
    const where = { userId, revokedAt: null, ...(exceptId ? { NOT: { id: exceptId } } : {}) };
    const rows = await prisma.session.findMany({ where, select: { id: true } });
    if (rows.length === 0) return [];
    await prisma.session.updateMany({ where, data: { revokedAt: new Date(), revokedReason: reason } });
    return rows.map((r) => r.id);
  },
};
