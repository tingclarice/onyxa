import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BusinessError,
  type Actor,
  type Business,
  type BusinessStore,
  type Invitation,
  type Membership,
  type InvitationSecrets,
} from "../types/business";
import {
  createBusiness,
  getWorkspace,
  inviteMember,
  respondToInvitation,
  revokeInvitation,
  updateBusiness,
} from "./business-access";

const secrets = (hash: string): InvitationSecrets => ({
  issue: () => ({ code: "raw:" + hash, hash }),
  hash: (code) => code.slice(4),
});

const now = new Date("2026-11-07T00:00:00Z");
const owner: Actor = {
  id: "owner",
  email: "owner@example.com",
};
const staff: Actor = {
  id: "staff",
  email: "staff@example.com",
};
const business: Business = {
  id: "business",
  name: "Warung Sari",
  businessType: "STORE",
  priceIncreaseThresholdPercent: 5,
  priceIncreaseAlertsEnabled: true,
  slowMovingAlertsEnabled: true,
};
const ownerMember: Membership = {
  id: "owner-member",
  businessId: business.id,
  userId: owner.id,
  email: owner.email ?? "",
  role: "OWNER",
  removedAt: null,
  business,
};

function fixture() {
  let businesses: Business[] = [structuredClone(business)];
  let members: Membership[] = [structuredClone(ownerMember)];
  let invitations: (Invitation & { tokenHash: string })[] = [];
  let sequence = 0;
  let tail: Promise<void> = Promise.resolve();
  let failMemberWrite = false;
  const store: BusinessStore = {
    async listMemberships(userId) {
      return members.filter((m) => m.userId === userId && !m.removedAt);
    },
    async findMembership(businessId, userId) {
      return (
        members.find(
          (m) => m.businessId === businessId && m.userId === userId,
        ) ?? null
      );
    },
    async findMemberByEmail(businessId, email) {
      return (
        members.find(
          (m) =>
            m.businessId === businessId &&
            m.email.toLowerCase() === email &&
            !m.removedAt,
        ) ?? null
      );
    },
    async listMembers(businessId) {
      return members.filter((m) => m.businessId === businessId && !m.removedAt);
    },
    async findRecipientInvitation(tokenHash, email) {
      return (
        invitations.find(
          (i) => i.tokenHash === tokenHash && i.emailKey === email,
        ) ?? null
      );
    },
    async findBusinessInvitation(id, businessId) {
      return (
        invitations.find((i) => i.id === id && i.businessId === businessId) ??
        null
      );
    },
    async listBusinessInvitations(businessId) {
      return invitations.filter((i) => i.businessId === businessId);
    },
    async createBusiness(input, creator) {
      const record: Business = {
        ...business,
        ...input,
        id: `new-business-${++sequence}`,
      };
      businesses.push(record);
      if (failMemberWrite) throw new Error("member insert failed");
      members.push({
        id: `member-${++sequence}`,
        businessId: record.id,
        ...creator,
        removedAt: null,
        business: record,
      });
      return record;
    },
    async updateProfile(businessId, input) {
      businesses = businesses.map((b) =>
        b.id === businessId ? { ...b, ...input } : b,
      );
    },
    async updateAlerts(businessId, input) {
      businesses = businesses.map((b) =>
        b.id === businessId ? { ...b, ...input } : b,
      );
    },
    async createInvitation(input) {
      invitations.push({
        ...input,
        id: `invitation-${++sequence}`,
        businessName:
          businesses.find((b) => b.id === input.businessId)?.name ?? "",
        inviterIsOwner: true,
        expiresAt: input.expiresAt.toISOString(),
        acceptedAt: null,
        revokedAt: null,
      });
    },
    async closeInvitation(id, businessId, date, outcome) {
      const invite = invitations.find(
        (i) =>
          i.id === id &&
          i.businessId === businessId &&
          !i.acceptedAt &&
          !i.revokedAt &&
          Date.parse(i.expiresAt) > date.getTime(),
      );
      if (!invite) return 0;
      if (outcome === "accepted") invite.acceptedAt = date.toISOString();
      else invite.revokedAt = date.toISOString();
      return 1;
    },
    async saveMembership(businessId, userId, email, role) {
      if (failMemberWrite) throw new Error("member insert failed");
      const record = businesses.find((b) => b.id === businessId);
      assert(record);
      const existing = members.find(
        (m) => m.businessId === businessId && m.userId === userId,
      );
      if (existing) Object.assign(existing, { email, role, removedAt: null });
      else
        members.push({
          id: `member-${++sequence}`,
          businessId,
          userId,
          email,
          role,
          removedAt: null,
          business: record,
        });
    },
    async transaction<T>(
      run: (repository: BusinessStore) => Promise<T>,
    ): Promise<T> {
      const prior = tail;
      let release: () => void = () => {};
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await prior;
      const snapshot = structuredClone({ businesses, members, invitations });
      try {
        return await run(store);
      } catch (error) {
        ({ businesses, members, invitations } = snapshot);
        throw error;
      } finally {
        release();
      }
    },
  };
  return {
    store,
    members: () => members,
    businesses: () => businesses,
    invitations: () => invitations,
    failMemberWrite: () => {
      failMemberWrite = true;
    },
  };
}

test("a new account has no business and onboarding performs no provisioning", async () => {
  const f = fixture();
  const result = await getWorkspace(staff, business.id, now, f.store);
  assert.equal(result.active, null);
  assert.deepEqual(result.memberships, []);
  assert.equal(f.businesses().length, 1);
  assert.equal(f.members().length, 1);
});

test("business creation makes the creator its owner and rolls back on membership failure", async () => {
  const f = fixture();
  const created = await createBusiness(
    staff,
    { name: "Kedai Andi", businessType: "CAFE_RESTAURANT" },
    f.store,
  );
  assert.equal(
    f.members().find((m) => m.businessId === created.id)?.role,
    "OWNER",
  );
  assert.equal(
    f.members().find((m) => m.businessId === created.id)?.userId,
    staff.id,
  );
  const before = f.businesses().length;
  f.failMemberWrite();
  await assert.rejects(
    createBusiness(staff, { name: "Rollback", businessType: "OTHER" }, f.store),
  );
  assert.equal(f.businesses().length, before);
});

test("invitations require both the target account and secret; email alone exposes nothing", async () => {
  const f = fixture();
  await inviteMember(
    owner,
    business.id,
    "STAFF@EXAMPLE.COM",
    now,
    secrets("hash"),
    f.store,
  );
  assert.equal(f.members().length, 1);
  assert.equal(
    (await getWorkspace(staff, undefined, now, f.store, "hash")).invitations
      .length,
    1,
  );
  assert.equal(
    (await getWorkspace(owner, undefined, now, f.store)).invitations.length,
    0,
  );
  assert.equal(
    (await getWorkspace({ ...staff }, undefined, now, f.store)).invitations
      .length,
    0,
  );
  await assert.rejects(
    respondToInvitation(
      owner,
      "hash",
      "accept",
      now,
      f.store,
      f.invitations().find((i) => i.tokenHash === "hash")?.id ?? "missing",
    ),
    BusinessError,
  );
});

test("concurrent acceptance is idempotent and does not create duplicate memberships", async () => {
  const f = fixture();
  await inviteMember(
    owner,
    business.id,
    staff.email ?? "",
    now,
    secrets("hash"),
    f.store,
  );
  const id = f.invitations()[0].tokenHash;
  const result = await Promise.all([
    respondToInvitation(
      staff,
      id,
      "accept",
      now,
      f.store,
      f.invitations().find((i) => i.tokenHash === id)?.id ?? "missing",
    ),
    respondToInvitation(
      staff,
      id,
      "accept",
      now,
      f.store,
      f.invitations().find((i) => i.tokenHash === id)?.id ?? "missing",
    ),
  ]);
  assert.deepEqual(result, [business.id, business.id]);
  assert.equal(f.members().filter((m) => m.userId === staff.id).length, 1);
  assert.equal(f.members().find((m) => m.userId === staff.id)?.role, "STAFF");
  assert.equal(
    (await getWorkspace(staff, undefined, now, f.store)).invitations.length,
    0,
  );
});

test("failed member creation rolls back consuming the invitation", async () => {
  const f = fixture();
  await inviteMember(
    owner,
    business.id,
    staff.email ?? "",
    now,
    secrets("hash"),
    f.store,
  );
  f.failMemberWrite();
  await assert.rejects(
    respondToInvitation(
      staff,
      "hash",
      "accept",
      now,
      f.store,
      f.invitations().find((i) => i.tokenHash === "hash")?.id ?? "missing",
    ),
  );
  assert.equal(f.invitations()[0].acceptedAt, null);
  assert.equal(f.members().length, 1);
});

test("staff cannot invite or update profiles and owners cannot revoke another tenant's invite", async () => {
  const f = fixture();
  await inviteMember(
    owner,
    business.id,
    staff.email ?? "",
    now,
    secrets("hash"),
    f.store,
  );
  const inviteId = f.invitations()[0].id;
  await respondToInvitation(
    staff,
    "hash",
    "accept",
    now,
    f.store,
    f.invitations().find((i) => i.tokenHash === "hash")?.id ?? "missing",
  );
  await assert.rejects(
    inviteMember(
      staff,
      business.id,
      "third@example.com",
      now,
      secrets("hash2"),
      f.store,
    ),
    (e: unknown) => e instanceof BusinessError && e.code === "owner_required",
  );
  await assert.rejects(
    updateBusiness(
      staff,
      business.id,
      { name: "Forged", businessType: "OTHER" },
      f.store,
    ),
    BusinessError,
  );
  await assert.rejects(
    revokeInvitation(owner, "other-business", inviteId, now, f.store),
    BusinessError,
  );
});

test("duplicate invitations, dismissal, revocation and expired acceptance are handled", async () => {
  const f = fixture();
  await inviteMember(
    owner,
    business.id,
    staff.email ?? "",
    now,
    secrets("hash"),
    f.store,
  );
  await assert.rejects(
    inviteMember(
      owner,
      business.id,
      staff.email ?? "",
      now,
      secrets("hash2"),
      f.store,
    ),
    (e: unknown) => e instanceof BusinessError && e.code === "already_invited",
  );
  await respondToInvitation(
    staff,
    "hash",
    "dismiss",
    now,
    f.store,
    f.invitations().find((i) => i.tokenHash === "hash")?.id ?? "missing",
  );
  assert.equal(f.members().length, 1);
  await inviteMember(
    owner,
    business.id,
    staff.email ?? "",
    now,
    secrets("hash3"),
    f.store,
  );
  const second = f.invitations()[1].id;
  await revokeInvitation(owner, business.id, second, now, f.store);
  await assert.rejects(
    respondToInvitation(
      staff,
      "hash3",
      "accept",
      now,
      f.store,
      f.invitations().find((i) => i.tokenHash === "hash3")?.id ?? "missing",
    ),
    BusinessError,
  );
  await inviteMember(
    owner,
    business.id,
    staff.email ?? "",
    now,
    secrets("hash4"),
    f.store,
  );
  await assert.rejects(
    respondToInvitation(
      staff,
      "hash4",
      "accept",
      new Date("2026-11-14T00:00:00Z"),
      f.store,
      f.invitations().find((i) => i.tokenHash === "hash4")?.id ?? "missing",
    ),
    BusinessError,
  );
  assert.equal(f.members().length, 1);
});
