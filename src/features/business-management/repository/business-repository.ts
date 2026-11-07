import "server-only";
import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type {
  AlertPreferences,
  Business,
  BusinessProfileInput,
  MemberRole,
} from "../types/business";
import { businessColumns, toBusiness } from "./record-mappers";

/** Creates the business and its owner membership in one write. */
export async function createBusinessWithOwner(
  profile: BusinessProfileInput,
  owner: { userId: string; email: string; role: MemberRole },
  db: DatabaseClient = getPrisma(),
): Promise<Business> {
  const row = await db.business.create({
    data: { ...profile, members: { create: owner } },
    select: businessColumns,
  });
  return toBusiness(row);
}

export async function saveBusinessProfile(
  businessId: string,
  profile: BusinessProfileInput,
  db: DatabaseClient = getPrisma(),
): Promise<void> {
  await db.business.update({
    where: { id: businessId },
    data: profile,
    select: { id: true },
  });
}

export async function saveAlertPreferences(
  businessId: string,
  preferences: AlertPreferences,
  db: DatabaseClient = getPrisma(),
): Promise<void> {
  await db.business.update({
    where: { id: businessId },
    data: preferences,
    select: { id: true },
  });
}
