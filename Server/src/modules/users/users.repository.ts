import { prisma } from "../../config/db";
import type { Provider } from "../../generated/prisma/enums";
import type { User } from "../../generated/prisma/client";

export type { User };

export type CreateUserInput = {
  publicId: string;
  email: string;
  emailVerifiedAt: Date | null;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  displayName: string;
  handle: string;
};

export const usersRepository = {
  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } });
  },

  findByHandle(handle: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { handle } });
  },

  findByProviderAccount(provider: Provider, providerAccountId: string): Promise<User | null> {
    return prisma.account
      .findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } }, include: { user: true } })
      .then((account) => account?.user ?? null);
  },

  create(input: CreateUserInput): Promise<User> {
    return prisma.user.create({ data: input });
  },

  markEmailVerified(id: string): Promise<User> {
    return prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
  },

  markPhoneVerified(id: string): Promise<User> {
    return prisma.user.update({ where: { id }, data: { phoneVerifiedAt: new Date() } });
  },

  linkProviderAccount(input: {
    userId: string;
    provider: Provider;
    providerAccountId: string;
    accessTokenEnc: string | null;
    scopes: string | null;
  }): Promise<void> {
    return prisma.account
      .upsert({
        where: { provider_providerAccountId: { provider: input.provider, providerAccountId: input.providerAccountId } },
        create: input,
        update: { accessTokenEnc: input.accessTokenEnc, scopes: input.scopes },
      })
      .then(() => undefined);
  },
};
