import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import {
  AccountExistsError,
  type AuthUser,
  type CredentialAccount,
  type LoginState,
} from "../types/auth";

// Only these columns are ever sent outside the repository as an AuthUser.
const publicUserColumns = {
  id: true,
  email: true,
  name: true,
} satisfies Prisma.UserSelect;

/** Includes the password hash: use only for checking a login. */
export async function findAccountByEmail(
  email: string,
  db: DatabaseClient = getPrisma(),
): Promise<CredentialAccount | null> {
  return db.user.findUnique({
    where: { email },
    select: {
      ...publicUserColumns,
      passwordHash: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      loginVersion: true,
    },
  });
}

export async function findUserById(
  id: string,
  db: DatabaseClient = getPrisma(),
): Promise<AuthUser | null> {
  return db.user.findUnique({ where: { id }, select: publicUserColumns });
}

/** Throws AccountExistsError when the email is already registered. */
export async function createAccount(
  account: { email: string; name: string; passwordHash: string },
  db: DatabaseClient = getPrisma(),
): Promise<AuthUser> {
  try {
    return await db.user.create({ data: account, select: publicUserColumns });
  } catch (error) {
    const isDuplicateEmail =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    if (isDuplicateEmail) throw new AccountExistsError();
    throw error;
  }
}

/**
 * Saves the result of a login attempt, but only if nobody else saved one in
 * the meantime (the row still has `expectedVersion`).
 * Returns false when another login attempt won the race.
 */
export async function saveLoginAttempt(
  userId: string,
  expectedVersion: number,
  newState: LoginState,
  db: DatabaseClient = getPrisma(),
): Promise<boolean> {
  const result = await db.user.updateMany({
    where: { id: userId, loginVersion: expectedVersion },
    data: { ...newState, loginVersion: { increment: 1 } },
  });
  return result.count === 1;
}
