import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import type {
  Business,
  BusinessRepository,
  BusinessStore,
  Invitation,
  Membership,
} from "../types/business";

const businessSelect = {
  id: true,
  name: true,
  businessType: true,
  priceIncreaseThresholdPercent: true,
  priceIncreaseAlertsEnabled: true,
  slowMovingAlertsEnabled: true,
} satisfies Prisma.BusinessSelect;
const memberSelect = {
  id: true,
  businessId: true,
  userId: true,
  email: true,
  role: true,
  removedAt: true,
  business: { select: businessSelect },
} satisfies Prisma.BusinessMemberSelect;
const invitationSelect = {
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

function business(
  record: Prisma.BusinessGetPayload<{ select: typeof businessSelect }>,
): Business {
  return {
    ...record,
    priceIncreaseThresholdPercent:
      record.priceIncreaseThresholdPercent.toNumber(),
  };
}
function membership(
  record: Prisma.BusinessMemberGetPayload<{ select: typeof memberSelect }>,
): Membership {
  return {
    ...record,
    business: business(record.business),
    removedAt: record.removedAt?.toISOString() ?? null,
  };
}
function invitation(
  record: Prisma.BusinessInvitationGetPayload<{
    select: typeof invitationSelect;
  }>,
): Invitation {
  return {
    id: record.id,
    businessId: record.businessId,
    businessName: record.business.name,
    invitedByMemberId: record.invitedByMemberId,
    email: record.email,
    emailKey: record.emailKey,
    role: record.role,
    inviterIsOwner:
      record.invitedBy.role === "OWNER" && !record.invitedBy.removedAt,
    expiresAt: record.expiresAt.toISOString(),
    acceptedAt: record.acceptedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
  };
}

function repositoryFor(client: Prisma.TransactionClient): BusinessRepository {
  return {
    async listMemberships(userId) {
      return (
        await client.businessMember.findMany({
          where: { userId, removedAt: null },
          select: memberSelect,
          orderBy: { createdAt: "asc" },
        })
      ).map(membership);
    },
    async findMembership(businessId, userId) {
      const record = await client.businessMember.findUnique({
        where: { businessId_userId: { businessId, userId } },
        select: memberSelect,
      });
      return record ? membership(record) : null;
    },
    async findMemberByEmail(businessId, emailKey) {
      const record = await client.businessMember.findFirst({
        where: {
          businessId,
          email: { equals: emailKey, mode: "insensitive" },
          removedAt: null,
        },
        select: memberSelect,
      });
      return record ? membership(record) : null;
    },
    async listMembers(businessId) {
      return (
        await client.businessMember.findMany({
          where: { businessId, removedAt: null },
          select: memberSelect,
          orderBy: { createdAt: "asc" },
        })
      ).map(membership);
    },
    async listRecipientInvitations(emailKey) {
      return (
        await client.businessInvitation.findMany({
          where: { emailKey, acceptedAt: null, revokedAt: null },
          select: invitationSelect,
          orderBy: { createdAt: "desc" },
        })
      ).map(invitation);
    },
    async findRecipientInvitation(invitationId, emailKey) {
      const record = await client.businessInvitation.findFirst({
        where: { id: invitationId, emailKey },
        select: invitationSelect,
      });
      return record ? invitation(record) : null;
    },
    async findBusinessInvitation(id, businessId) {
      const record = await client.businessInvitation.findFirst({
        where: { id, businessId },
        select: invitationSelect,
      });
      return record ? invitation(record) : null;
    },
    async listBusinessInvitations(businessId) {
      return (
        await client.businessInvitation.findMany({
          where: { businessId, acceptedAt: null, revokedAt: null },
          select: invitationSelect,
          orderBy: { createdAt: "desc" },
        })
      ).map(invitation);
    },
    async createBusiness(input, owner) {
      return business(
        await client.business.create({
          data: { ...input, members: { create: owner } },
          select: businessSelect,
        }),
      );
    },
    async updateProfile(businessId, input) {
      await client.business.update({
        where: { id: businessId },
        data: input,
        select: { id: true },
      });
    },
    async updateAlerts(businessId, input) {
      await client.business.update({
        where: { id: businessId },
        data: input,
        select: { id: true },
      });
    },
    async createInvitation(input) {
      await client.businessInvitation.create({
        data: input,
        select: { id: true },
      });
    },
    async closeInvitation(id, businessId, now, outcome) {
      const result = await client.businessInvitation.updateMany({
        where: {
          id,
          businessId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: outcome === "accepted" ? { acceptedAt: now } : { revokedAt: now },
      });
      return result.count;
    },
    async saveMembership(businessId, userId, email, role) {
      await client.businessMember.upsert({
        where: { businessId_userId: { businessId, userId } },
        create: { businessId, userId, email, role },
        update: { email, role, removedAt: null },
        select: { id: true },
      });
    },
  };
}

export function createBusinessStore(): BusinessStore {
  const client = getPrisma();
  return {
    ...repositoryFor(client),
    async transaction<T>(
      run: (repository: BusinessRepository) => Promise<T>,
    ): Promise<T> {
      for (let attempt = 0; ; attempt++) {
        try {
          return await client.$transaction(
            (transaction) => run(repositoryFor(transaction)),
            { isolationLevel: "Serializable" },
          );
        } catch (error) {
          // A conflicting serializable transaction is safe to replay after rollback.
          if (
            attempt >= 2 ||
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== "P2034"
          )
            throw error;
        }
      }
    },
  };
}
