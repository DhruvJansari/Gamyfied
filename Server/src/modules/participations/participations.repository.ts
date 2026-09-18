import { prisma } from "../../config/db";
import type { Participation } from "../../generated/prisma/client";
import type { ParticipationKind, VerificationStatus } from "../../generated/prisma/enums";

export type { Participation };

export type ParticipationFields = {
  kind: ParticipationKind;
  title: string;
  note: string | null;
  url: string | null;
  year: number | null;
};

export const participationsRepository = {
  listByUserId(userId: string): Promise<Participation[]> {
    return prisma.participation.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  },

  findByIdForUser(id: string, userId: string): Promise<Participation | null> {
    return prisma.participation.findFirst({ where: { id, userId } });
  },

  countByUserId(userId: string): Promise<number> {
    return prisma.participation.count({ where: { userId } });
  },

  create(userId: string, fields: ParticipationFields): Promise<Participation> {
    return prisma.participation.create({ data: { userId, ...fields } });
  },

  update(id: string, fields: Partial<ParticipationFields> & { verificationStatus?: VerificationStatus }): Promise<Participation> {
    return prisma.participation.update({ where: { id }, data: fields });
  },

  setVerificationStatus(id: string, verificationStatus: VerificationStatus): Promise<Participation> {
    return prisma.participation.update({ where: { id }, data: { verificationStatus } });
  },

  deleteById(id: string): Promise<void> {
    return prisma.participation.delete({ where: { id } }).then(() => undefined);
  },
};
