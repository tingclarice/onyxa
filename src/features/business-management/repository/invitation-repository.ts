import "server-only";
import { getPrisma } from "@/lib/prisma";
import type { DatabaseClient } from "@/lib/database-transaction";
import type { Invitation, NewInvitation } from "../types/business";
import { invitationColumns, toInvitation } from "./record-mappers";

/** Invitations sent to this email that were not accepted or revoked yet (the inbox). */
export async function listUnansweredInvitationsForRecipient(
  recipientEmail: string,
  db: DatabaseClient = getPrisma(),
): Promise<Invitation[]> {
  const rows = await db.businessInvitation.findMany({
    where: { emailKey: recipientEmail, acceptedAt: null, revokedAt: null },
    select: invitationColumns,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toInvitation);
}

/** One invitation, only if it was sent to this email. */
export async function findInvitationForRecipient(
  invitationId: string,
  recipientEmail: string,
  db: DatabaseClient = getPrisma(),
): Promise<Invitation | null> {
  const row = await db.businessInvitation.findFirst({
    where: { id: invitationId, emailKey: recipientEmail },
    select: invitationColumns,
  });
  return row ? toInvitation(row) : null;
}

/** One invitation, only if it belongs to this business. */
export async function findInvitationOfBusiness(
  invitationId: string,
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<Invitation | null> {
  const row = await db.businessInvitation.findFirst({
    where: { id: invitationId, businessId },
    select: invitationColumns,
  });
  return row ? toInvitation(row) : null;
}

/** Invitations this business sent that were not accepted or revoked yet. */
export async function listUnansweredInvitationsOfBusiness(
  businessId: string,
  db: DatabaseClient = getPrisma(),
): Promise<Invitation[]> {
  const rows = await db.businessInvitation.findMany({
    where: { businessId, acceptedAt: null, revokedAt: null },
    select: invitationColumns,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toInvitation);
}

export async function createInvitation(
  invitation: NewInvitation,
  db: DatabaseClient = getPrisma(),
): Promise<void> {
  await db.businessInvitation.create({
    data: invitation,
    select: { id: true },
  });
}

/**
 * Marks the invitation accepted, only while it is still open.
 * Returns how many rows changed: 1 = done, 0 = it was already closed/expired.
 */
export async function markInvitationAccepted(
  invitationId: string,
  businessId: string,
  now: Date,
  db: DatabaseClient = getPrisma(),
): Promise<number> {
  const result = await db.businessInvitation.updateMany({
    where: stillOpen(invitationId, businessId, now),
    data: { acceptedAt: now },
  });
  return result.count;
}

/**
 * Marks the invitation revoked (owner cancelled it, or recipient said No),
 * only while it is still open. Returns how many rows changed.
 */
export async function markInvitationRevoked(
  invitationId: string,
  businessId: string,
  now: Date,
  db: DatabaseClient = getPrisma(),
): Promise<number> {
  const result = await db.businessInvitation.updateMany({
    where: stillOpen(invitationId, businessId, now),
    data: { revokedAt: now },
  });
  return result.count;
}

function stillOpen(invitationId: string, businessId: string, now: Date) {
  return {
    id: invitationId,
    businessId,
    acceptedAt: null,
    revokedAt: null,
    expiresAt: { gt: now },
  };
}
