import { prisma } from "../../config/db";
import type { Prisma, Verification } from "../../generated/prisma/client";
import type { VerificationSource, VerificationStatus, VerificationSubject } from "../../generated/prisma/enums";

export type { Verification };

/** Statuses whose `points` count toward the score. */
const COUNTED_STATUSES = ["VERIFIED", "PARTIALLY_VERIFIED"] as const;

export const verificationRepository = {
  create(input: { userId: string; subjectType: VerificationSubject; subjectId: string; source: VerificationSource }): Promise<Verification> {
    return prisma.verification.create({ data: input });
  },

  findPendingBySubject(subjectType: VerificationSubject, subjectId: string): Promise<Verification | null> {
    return prisma.verification.findFirst({
      where: { subjectType, subjectId, status: "VERIFICATION_PENDING" },
      orderBy: { requestedAt: "desc" },
    });
  },

  findLatestBySubject(subjectType: VerificationSubject, subjectId: string): Promise<Verification | null> {
    return prisma.verification.findFirst({ where: { subjectType, subjectId }, orderBy: { requestedAt: "desc" } });
  },

  complete(id: string, outcome: { status: VerificationStatus; points: number | null; signals: unknown; result: unknown; errorCode: string | null }): Promise<Verification> {
    return prisma.verification.update({
      where: { id },
      data: {
        status: outcome.status,
        points: outcome.points,
        signals: outcome.signals === undefined ? undefined : (outcome.signals as Prisma.InputJsonValue),
        result: outcome.result === undefined ? undefined : (outcome.result as Prisma.InputJsonValue),
        errorCode: outcome.errorCode,
        completedAt: new Date(),
      },
    });
  },

  /**
   * Points from the most recent counted verification of each of the user's subjects.
   * A user has at most 4 + 5 + 5 subjects, so this stays a handful of rows.
   */
  async countedPointsByUser(userId: string): Promise<Map<string, number>> {
    const rows = await prisma.verification.findMany({
      where: { userId, status: { in: [...COUNTED_STATUSES] } },
      orderBy: { completedAt: "desc" },
      select: { subjectId: true, points: true },
    });
    const bySubject = new Map<string, number>();
    for (const row of rows) {
      if (!bySubject.has(row.subjectId)) bySubject.set(row.subjectId, row.points ?? 0);
    }
    return bySubject;
  },
};
