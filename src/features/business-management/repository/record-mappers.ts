import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Business, Invitation, Membership } from "../types/business";

// Which columns to read, and how to turn Prisma rows into our own types.
// Shared by the business, membership and invitation repositories.

export const businessColumns = {
  id: true,
  name: true,
  businessType: true,
  priceIncreaseThresholdPercent: true,
  priceIncreaseAlertsEnabled: true,
  slowMovingAlertsEnabled: true,
} satisfies Prisma.BusinessSelect;

export const membershipColumns = {
  id: true,
  businessId: true,
  userId: true,
  email: true,
  role: true,
  removedAt: true,
  business: { select: businessColumns },
} satisfies Prisma.BusinessMemberSelect;

export const invitationColumns = {
  id: true,
  businessId: true,
  invitedByMemberId: true,
  email: true,
  emailKey: true,
  role: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  business: { select: { name: true } },
  invitedBy: { select: { role: true, removedAt: true } },
} satisfies Prisma.BusinessInvitationSelect;

type BusinessRow = Prisma.BusinessGetPayload<{
  select: typeof businessColumns;
}>;
type MembershipRow = Prisma.BusinessMemberGetPayload<{
  select: typeof membershipColumns;
}>;
type InvitationRow = Prisma.BusinessInvitationGetPayload<{
  select: typeof invitationColumns;
}>;

export function toBusiness(row: BusinessRow): Business {
  return {
    ...row,
    // Prisma Decimal → plain number so it can be sent to the browser.
    priceIncreaseThresholdPercent: row.priceIncreaseThresholdPercent.toNumber(),
  };
}

export function toMembership(row: MembershipRow): Membership {
  return {
    ...row,
    business: toBusiness(row.business),
    removedAt: row.removedAt?.toISOString() ?? null,
  };
}

export function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    businessId: row.businessId,
    businessName: row.business.name,
    invitedByMemberId: row.invitedByMemberId,
    email: row.email,
    emailKey: row.emailKey,
    role: row.role,
    inviterIsOwner: row.invitedBy.role === "OWNER" && !row.invitedBy.removedAt,
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}
