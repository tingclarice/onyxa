import "server-only";
import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type { MemberRole, Membership } from "../types/business";
import { membershipColumns, toMembership } from "./record-mappers";

/** All businesses the user currently belongs to, oldest first. */
export async function listActiveMembershipsOfUser(
  userId: string,
  db: DatabaseClient = getPrisma(),
): Promise<Membership[]> {
  const rows = await db.businessMember.findMany({
    where: { userId, removedAt: null },
    select: membershipColumns,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toMembership);
}

/** The user's membership row in one business (may be a removed member). */
export async function findMembership(
  businessId: string,
  userId: string,
  db: DatabaseClient = getPrisma(),
): Promise<Membership | null> {
  const row = await db.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
    select: membershipColumns,
  });
  return row ? toMembership(row) : null;
}

export async function findActiveMemberByEmail(
  businessId: string,
  email: string,
  db: DatabaseClient = getPrisma(),
): Promise<Membership | null> {
  const row = await db.businessMember.findFirst({
    where: {
      businessId,
      email: { equals: email, mode: "insensitive" },
      removedAt: null,
    },
    select: membershipColumns,
  });
  return row ? toMembership(row) : null;
}

/** Everyone in the business (team list on the settings page). */
export async function listActiveMembersOfBusiness(
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<Membership[]> {
  const rows = await db.businessMember.findMany({
    where: { businessId, removedAt: null },
    select: membershipColumns,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toMembership);
}

/** Adds the user to the business, or re-activates a removed membership. */
export async function saveMembership(
  businessId: string,
  userId: string,
  email: string,
  role: MemberRole,
  db: DatabaseClient = getPrisma(),
): Promise<void> {
  await db.businessMember.upsert({
    where: { businessId_userId: { businessId, userId } },
    create: { businessId, userId, email, role },
    update: { email, role, removedAt: null },
    select: { id: true },
  });
}
