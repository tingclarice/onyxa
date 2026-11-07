import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BusinessError,
  type Actor,
  type Business,
  type BusinessStore,
  type Invitation,
  type Membership,
} from "../types/business";
import {
  createBusiness,
  getWorkspace,
  inviteMember,
  respondToInvitation,
  revokeInvitation,
  updateBusiness,
} from "./business-access";

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
  let invitations: Invitation[] = [];
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
    async listRecipientInvitations(email) {
      return invitations.filter((i) => i.emailKey === email);
    },
    async findRecipientInvitation(id, email) {
      return (
        invitations.find((i) => i.id === id && i.emailKey === email) ?? null
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

test("a new account has no business and inbox reads perform no provisioning", async () => {
  const f = fixture();
  const result = await getWorkspace(staff, business.id, now, f.store);
  assert.equal(result.active, null);
  assert.deepEqual(result.memberships, []);
  assert.deepEqual(result.invitations, []);
  assert.equal(f.businesses().length, 1);
  assert.equal(f.members().length, 1);
});

test("a new user can create a business as owner and failed membership writes roll back", async () => {
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

test("invitations issued before signup automatically appear only in the recipient inbox", async () => {
  const f = fixture();
  await inviteMember(owner, business.id, "STAFF@EXAMPLE.COM", now, f.store);
  await inviteMember(owner, business.id, "other@example.com", now, f.store);
  assert.equal(f.members().length, 1);
  const inbox = await getWorkspace(
    { ...staff, email: "STAFF@EXAMPLE.COM" },
    undefined,
    now,
    f.store,
  );
  assert.equal(inbox.active, null);
  assert.equal(inbox.invitations.length, 1);
  assert.equal(inbox.invitations[0].email, "staff@example.com");
  assert.equal(
    (await getWorkspace(owner, undefined, now, f.store)).invitations.length,
    0,
  );
  assert.equal(
    (await getWorkspace({ ...staff, email: null }, undefined, now, f.store))
      .invitations.length,
    0,
  );
  assert.equal(
    (
      await getWorkspace(
        staff,
        undefined,
        new Date("2026-11-14T00:00:00Z"),
        f.store,
      )
    ).invitations.length,
    0,
  );
  await assert.rejects(
    respondToInvitation(owner, f.invitations()[0].id, "accept", now, f.store),
    BusinessError,
  );
  await assert.rejects(
    respondToInvitation(staff, "forged-invitation", "accept", now, f.store),
    BusinessError,
  );
  assert.equal(f.members().length, 1);
});

test("the inbox can contain multiple invitations without joining either business", async () => {
  const f = fixture();
  const second = await createBusiness(
    owner,
    { name: "Warung Kedua", businessType: "STORE" },
    f.store,
  );
  await inviteMember(owner, business.id, staff.email ?? "", now, f.store);
  await inviteMember(owner, second.id, staff.email ?? "", now, f.store);
  const result = await getWorkspace(staff, undefined, now, f.store);
  assert.equal(result.invitations.length, 2);
  assert.deepEqual(result.memberships, []);
  await respondToInvitation(
    staff,
    result.invitations[0].id,
    "dismiss",
    now,
    f.store,
  );
  assert.equal(
    (await getWorkspace(staff, undefined, now, f.store)).invitations.length,
    1,
  );
  assert.equal(
    f.members().some((m) => m.userId === staff.id),
    false,
  );
});

test("concurrent Yes responses grant one staff membership and are idempotent", async () => {
  const f = fixture();
  await inviteMember(owner, business.id, staff.email ?? "", now, f.store);
  const id = f.invitations()[0].id;
  const result = await Promise.all([
    respondToInvitation(staff, id, "accept", now, f.store),
    respondToInvitation(staff, id, "accept", now, f.store),
  ]);
  assert.deepEqual(result, [business.id, business.id]);
  assert.equal(f.members().filter((m) => m.userId === staff.id).length, 1);
  assert.equal(f.members().find((m) => m.userId === staff.id)?.role, "STAFF");
  assert.equal(
    (await getWorkspace(staff, undefined, now, f.store)).invitations.length,
    0,
  );
});

test("failed membership creation rolls back accepting the invitation", async () => {
  const f = fixture();
  await inviteMember(owner, business.id, staff.email ?? "", now, f.store);
  f.failMemberWrite();
  await assert.rejects(
    respondToInvitation(staff, f.invitations()[0].id, "accept", now, f.store),
  );
  assert.equal(f.invitations()[0].acceptedAt, null);
  assert.equal(f.members().length, 1);
});

test("staff cannot invite or edit profiles and owners cannot revoke another tenant's invite", async () => {
  const f = fixture();
  await inviteMember(owner, business.id, staff.email ?? "", now, f.store);
  const id = f.invitations()[0].id;
  await respondToInvitation(staff, id, "accept", now, f.store);
  await assert.rejects(
    inviteMember(staff, business.id, "third@example.com", now, f.store),
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
    revokeInvitation(owner, "other-business", id, now, f.store),
    BusinessError,
  );
});

test("duplicate, declined, revoked and expired invitations cannot grant access", async () => {
  const f = fixture();
  await inviteMember(owner, business.id, staff.email ?? "", now, f.store);
  const first = f.invitations()[0].id;
  await assert.rejects(
    inviteMember(owner, business.id, staff.email ?? "", now, f.store),
    (e: unknown) => e instanceof BusinessError && e.code === "already_invited",
  );
  await respondToInvitation(staff, first, "dismiss", now, f.store);
  await assert.rejects(
    respondToInvitation(staff, first, "accept", now, f.store),
    BusinessError,
  );
  await inviteMember(owner, business.id, staff.email ?? "", now, f.store);
  const second = f.invitations()[1].id;
  await revokeInvitation(owner, business.id, second, now, f.store);
  await assert.rejects(
    respondToInvitation(staff, second, "accept", now, f.store),
    BusinessError,
  );
  await inviteMember(owner, business.id, staff.email ?? "", now, f.store);
  await assert.rejects(
    respondToInvitation(
      staff,
      f.invitations()[2].id,
      "accept",
      new Date("2026-11-14T00:00:00Z"),
      f.store,
    ),
    BusinessError,
  );
  assert.equal(f.members().length, 1);
});

test("racing Yes and No responses cannot both consume an invitation", async () => {
  const f = fixture();
  await inviteMember(owner, business.id, staff.email ?? "", now, f.store);
  const id = f.invitations()[0].id;
  const result = await Promise.allSettled([
    respondToInvitation(staff, id, "dismiss", now, f.store),
    respondToInvitation(staff, id, "accept", now, f.store),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    f.members().some((m) => m.userId === staff.id),
    false,
  );
});
