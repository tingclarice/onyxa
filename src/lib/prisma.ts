import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var onyxaPrisma: PrismaClient | undefined;
}

export function getPrisma(): PrismaClient {
  if (globalThis.onyxaPrisma) return globalThis.onyxaPrisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DATABASE_URL before using the database.");

  globalThis.onyxaPrisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  return globalThis.onyxaPrisma;
}
