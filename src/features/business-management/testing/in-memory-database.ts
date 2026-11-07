// TEST ONLY. Replaces the business-management repository modules and
// runInTransaction with an in-memory version, so service and UI tests can run
// the real services without PostgreSQL.
//
// Call installInMemoryDatabase() at the top of a test file, BEFORE importing
// the module under test (use `await import(...)` afterwards).

import assert from "node:assert/strict";
import { mock } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type {
  AlertPreferences,
  Business,
  BusinessProfileInput,
  Invitation,
  MemberRole,
  Membership,
  NewInvitation,
} from "../types/business";

export interface InMemoryDatabase {
  businesses: Business[];
  members: Membership[];
  invitations: Invitation[];
  /** Makes the next membership write throw, to test rollback. */
  failMembershipWrites: boolean;
  /** How many repository functions were called (to prove "no database access"). */
  calls: number;
}

export const database: InMemoryDatabase = {
  businesses: [],
  members: [],
  invitations: [],
  failMembershipWrites: false,
  calls: 0,
};

let idSequence = 0;
let transactionQueue: Promise<void> = Promise.resolve();

export function resetDatabase(seed: Partial<InMemoryDatabase> = {}) {
  database.businesses = structuredClone(seed.businesses ?? []);
  database.members = structuredClone(seed.members ?? []);
  database.invitations = structuredClone(seed.invitations ?? []);
  database.failMembershipWrites = false;
  database.calls = 0;
  idSequence = 0;
}

function file(path: string) {
  return pathToFileURL(resolve(path)).href;
}
function repository(name: string) {
  return file(`src/features/business-management/repository/${name}.ts`);
}
function count() {
  database.calls++;
}
function isOpen(invitation: Invitation, invitationId: string, businessId: string, now: Date) {
  return (
    invitation.id === invitationId &&
    invitation.businessId === businessId &&
    !invitation.acceptedAt &&
    !invitation.revokedAt &&
    Date.parse(invitation.expiresAt) > now.getTime()
  );
}

export function installInMemoryDatabase() {
  mock.module("server-only", {});

  mock.module(file("src/lib/database-transaction.ts"), {
    namedExports: {
      // Runs transactions one at a time and restores the data when one throws.
      async runInTransaction<T>(work: (db: null) => Promise<T>): Promise<T> {
        const previous = transactionQueue;
        let finished: () => void = () => {};
        transactionQueue = new Promise<void>((done) => {
          finished = done;
        });
        await previous;
        const snapshot = structuredClone({
          businesses: database.businesses,
          members: database.members,
          invitations: database.invitations,
        });
        try {
          return await work(null);
        } catch (error) {
          Object.assign(database, snapshot);
          throw error;
        } finally {
          finished();
        }
      },
    },
  });

  mock.module(repository("business-repository"), {
    namedExports: {
      async createBusinessWithOwner(
        profile: BusinessProfileInput,
        owner: { userId: string; email: string; role: MemberRole },
      ) {
        count();
        if (database.failMembershipWrites) throw new Error("member insert failed");
        const business: Business = {
          id: `business-${++idSequence}`,
          ...profile,
          priceIncreaseThresholdPercent: 5,
          priceIncreaseAlertsEnabled: true,
          slowMovingAlertsEnabled: true,
        };
        database.businesses.push(business);
        database.members.push({
          id: `member-${++idSequence}`,
          businessId: business.id,
          ...owner,
          removedAt: null,
          business,
        });
        return business;
      },
      async saveBusinessProfile(businessId: string, profile: BusinessProfileInput) {
        count();
        const business = database.businesses.find((b) => b.id === businessId);
        if (business) Object.assign(business, profile);
      },
      async saveAlertPreferences(businessId: string, preferences: AlertPreferences) {
        count();
        const business = database.businesses.find((b) => b.id === businessId);
        if (business) Object.assign(business, preferences);
      },
    },
  });

  mock.module(repository("membership-repository"), {
    namedExports: {
      async listActiveMembershipsOfUser(userId: string) {
        count();
        return database.members.filter((m) => m.userId === userId && !m.removedAt);
      },
      async findMembership(businessId: string, userId: string) {
        count();
        return (
          database.members.find(
            (m) => m.businessId === businessId && m.userId === userId,
          ) ?? null
        );
      },
      async findActiveMemberByEmail(businessId: string, email: string) {
        count();
        return (
          database.members.find(
            (m) =>
              m.businessId === businessId &&
              m.email.toLowerCase() === email &&
              !m.removedAt,
          ) ?? null
        );
      },
      async listActiveMembersOfBusiness(businessId: string) {
        count();
        return database.members.filter(
          (m) => m.businessId === businessId && !m.removedAt,
        );
      },
      async saveMembership(
        businessId: string,
        userId: string,
        email: string,
        role: MemberRole,
      ) {
        count();
        if (database.failMembershipWrites) throw new Error("member insert failed");
        const business = database.businesses.find((b) => b.id === businessId);
        assert(business, `test data is missing business ${businessId}`);
        const existing = database.members.find(
          (m) => m.businessId === businessId && m.userId === userId,
        );
        if (existing) Object.assign(existing, { email, role, removedAt: null });
        else
          database.members.push({
            id: `member-${++idSequence}`,
            businessId,
            userId,
            email,
            role,
            removedAt: null,
            business,
          });
      },
    },
  });

  mock.module(repository("invitation-repository"), {
    namedExports: {
      async listUnansweredInvitationsForRecipient(email: string) {
        count();
        return database.invitations.filter(
          (i) => i.emailKey === email && !i.acceptedAt && !i.revokedAt,
        );
      },
      async findInvitationForRecipient(invitationId: string, email: string) {
        count();
        return (
          database.invitations.find(
            (i) => i.id === invitationId && i.emailKey === email,
          ) ?? null
        );
      },
      async findInvitationOfBusiness(invitationId: string, businessId: string) {
        count();
        return (
          database.invitations.find(
            (i) => i.id === invitationId && i.businessId === businessId,
          ) ?? null
        );
      },
      async listUnansweredInvitationsOfBusiness(businessId: string) {
        count();
        return database.invitations.filter(
          (i) => i.businessId === businessId && !i.acceptedAt && !i.revokedAt,
        );
      },
      async createInvitation(input: NewInvitation) {
        count();
        database.invitations.push({
          ...input,
          id: `invitation-${++idSequence}`,
          businessName:
            database.businesses.find((b) => b.id === input.businessId)?.name ?? "",
          inviterIsOwner: true,
          expiresAt: input.expiresAt.toISOString(),
          acceptedAt: null,
          revokedAt: null,
        });
      },
      async markInvitationAccepted(invitationId: string, businessId: string, now: Date) {
        count();
        const invitation = database.invitations.find((i) =>
          isOpen(i, invitationId, businessId, now),
        );
        if (!invitation) return 0;
        invitation.acceptedAt = now.toISOString();
        return 1;
      },
      async markInvitationRevoked(invitationId: string, businessId: string, now: Date) {
        count();
        const invitation = database.invitations.find((i) =>
          isOpen(i, invitationId, businessId, now),
        );
        if (!invitation) return 0;
        invitation.revokedAt = now.toISOString();
        return 1;
      },
    },
  });
}
