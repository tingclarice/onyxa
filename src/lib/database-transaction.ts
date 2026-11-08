import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

/**
 * The database handle every repository function accepts as its last argument.
 * Outside a transaction it is the shared Prisma client; inside
 * runInTransaction it is the transaction, so all writes commit together.
 */
export type DatabaseClient = Prisma.TransactionClient;

const MAX_ATTEMPTS = 3;
const SERIALIZATION_CONFLICT = "P2034";

/**
 * Runs `work` in one serializable database transaction.
 * If anything inside throws, every write inside is rolled back.
 * If PostgreSQL reports a conflict with another transaction running at the
 * same time, the whole `work` is safely retried (up to 3 attempts).
 */
export async function runInTransaction<T>(
  work: (db: DatabaseClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await getPrisma().$transaction((db) => work(db), {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      const isConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === SERIALIZATION_CONFLICT;
      if (!isConflict || attempt >= MAX_ATTEMPTS) throw error;
    }
  }
}
