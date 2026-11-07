import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { AccountExistsError, type AccountRepository } from "../types/auth";

const userSelect = {
  id: true,
  email: true,
  name: true,
} satisfies Prisma.UserSelect;
export function createAccountRepository(): AccountRepository {
  const client = getPrisma();
  return {
    findCredentials(email) {
      return client.user.findUnique({
        where: { email },
        select: {
          ...userSelect,
          passwordHash: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          loginVersion: true,
        },
      });
    },
    findUser(id) {
      return client.user.findUnique({ where: { id }, select: userSelect });
    },
    async createAccount(input) {
      try {
        return await client.user.create({ data: input, select: userSelect });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          throw new AccountExistsError();
        throw error;
      }
    },
    async recordLogin(id, version, state) {
      const result = await client.user.updateMany({
        where: { id, loginVersion: version },
        data: { ...state, loginVersion: { increment: 1 } },
      });
      return result.count === 1;
    },
  };
}
