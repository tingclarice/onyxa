// Runs the real services against an in-memory database (no PostgreSQL).
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { BusinessError } from "../types/business";
import {
  database,
  installInMemoryDatabase,
  resetDatabase,
} from "../testing/in-memory-database";
import {
  business,
  now,
  oneWeekLater,
  owner,
  ownerMembership,
  staff,
} from "../testing/sample-data";

installInMemoryDatabase();
// Import AFTER the fake database is installed.
const services = Promise.all([
  import("./workspace-service"),
  import("./business-service"),
  import("./invitation-service"),
]).then(([workspace, business, invitation]) => ({
  ...workspace,
  ...business,
  ...invitation,
}));

beforeEach(() => {
  resetDatabase({ businesses: [business], members: [ownerMembership] });
});

const staffEmail = "staff@example.com";
const firstInvitationId = () => database.invitations[0].id;
const staffMemberships = () =>
  database.members.filter((m) => m.userId === staff.id);

test("a new account has no business and reading the inbox creates nothing", async () => {
  const { getWorkspace } = await services;
  const result = await getWorkspace(staff, business.id, now);
  assert.equal(result.active, null);
  assert.deepEqual(result.memberships, []);
  assert.deepEqual(result.invitations, []);
  assert.equal(database.businesses.length, 1);
  assert.equal(database.members.length, 1);
});

test("a new user can create a business and becomes its owner", async () => {
  const { createBusiness } = await services;
  const created = await createBusiness(
    { ...staff, email: "Staff@Example.com" },
    { name: "Kedai Andi", businessType: "CAFE_RESTAURANT" },
  );
  const membership = database.members.find((m) => m.businessId === created.id);
  assert.equal(membership?.role, "OWNER");
  assert.equal(membership?.userId, staff.id);
  assert.equal(membership?.email, "staff@example.com");
});

test("invitations sent before signup appear only in the recipient's inbox", async () => {
  const { getWorkspace, inviteMember, acceptInvitation } = await services;
  await inviteMember(owner, business.id, "STAFF@EXAMPLE.COM", now);
  await inviteMember(owner, business.id, "other@example.com", now);
  assert.equal(database.members.length, 1);

  const inbox = await getWorkspace(
    { ...staff, email: "STAFF@EXAMPLE.COM" },
    undefined,
    now,
  );
  assert.equal(inbox.active, null);
  assert.equal(inbox.invitations.length, 1);
  assert.equal(inbox.invitations[0].email, staffEmail);

  assert.equal((await getWorkspace(owner, undefined, now)).invitations.length, 0);
  assert.equal(
    (await getWorkspace({ ...staff, email: null }, undefined, now)).invitations
      .length,
    0,
  );
  assert.equal(
    (await getWorkspace(staff, undefined, oneWeekLater)).invitations.length,
    0,
  );

  await assert.rejects(
    acceptInvitation(owner, firstInvitationId(), now),
    BusinessError,
  );
  await assert.rejects(
    acceptInvitation(staff, "forged-invitation", now),
    BusinessError,
  );
  assert.equal(database.members.length, 1);
});

test("the inbox can hold several invitations without joining any business", async () => {
  const { getWorkspace, createBusiness, inviteMember, declineInvitation } = await services;
  const second = await createBusiness(owner, {
    name: "Warung Kedua",
    businessType: "STORE",
  });
  await inviteMember(owner, business.id, staffEmail, now);
  await inviteMember(owner, second.id, staffEmail, now);

  const result = await getWorkspace(staff, undefined, now);
  assert.equal(result.invitations.length, 2);
  assert.deepEqual(result.memberships, []);

  await declineInvitation(staff, result.invitations[0].id, now);
  assert.equal((await getWorkspace(staff, undefined, now)).invitations.length, 1);
  assert.equal(staffMemberships().length, 0);
});

test("two Yes clicks at once give one STAFF membership and both succeed", async () => {
  const { getWorkspace, inviteMember, acceptInvitation } = await services;
  await inviteMember(owner, business.id, staffEmail, now);
  const id = firstInvitationId();
  const results = await Promise.all([
    acceptInvitation(staff, id, now),
    acceptInvitation(staff, id, now),
  ]);
  assert.deepEqual(results, [business.id, business.id]);
  assert.equal(staffMemberships().length, 1);
  assert.equal(staffMemberships()[0].role, "STAFF");
  assert.equal((await getWorkspace(staff, undefined, now)).invitations.length, 0);
});

test("if adding the membership fails, the invitation stays unaccepted", async () => {
  const { inviteMember, acceptInvitation } = await services;
  await inviteMember(owner, business.id, staffEmail, now);
  database.failMembershipWrites = true;
  await assert.rejects(acceptInvitation(staff, firstInvitationId(), now));
  assert.equal(database.invitations[0].acceptedAt, null);
  assert.equal(database.members.length, 1);
});

test("staff cannot invite or edit the profile, and owners cannot revoke another business's invitation", async () => {
  const { updateBusinessProfile, inviteMember, acceptInvitation, revokeInvitation } = await services;
  await inviteMember(owner, business.id, staffEmail, now);
  const id = firstInvitationId();
  await acceptInvitation(staff, id, now);

  await assert.rejects(
    inviteMember(staff, business.id, "third@example.com", now),
    (e: unknown) => e instanceof BusinessError && e.code === "owner_required",
  );
  await assert.rejects(
    updateBusinessProfile(staff, business.id, {
      name: "Forged",
      businessType: "OTHER",
    }),
    BusinessError,
  );
  await assert.rejects(
    revokeInvitation(owner, "other-business", id, now),
    BusinessError,
  );
});

test("duplicate, declined, revoked and expired invitations cannot grant access", async () => {
  const { inviteMember, acceptInvitation, declineInvitation, revokeInvitation } = await services;
  await inviteMember(owner, business.id, staffEmail, now);
  const declined = database.invitations[0].id;
  await assert.rejects(
    inviteMember(owner, business.id, staffEmail, now),
    (e: unknown) => e instanceof BusinessError && e.code === "already_invited",
  );
  await declineInvitation(staff, declined, now);
  await assert.rejects(acceptInvitation(staff, declined, now), BusinessError);

  await inviteMember(owner, business.id, staffEmail, now);
  const revoked = database.invitations[1].id;
  await revokeInvitation(owner, business.id, revoked, now);
  await assert.rejects(acceptInvitation(staff, revoked, now), BusinessError);

  await inviteMember(owner, business.id, staffEmail, now);
  await assert.rejects(
    acceptInvitation(staff, database.invitations[2].id, oneWeekLater),
    BusinessError,
  );
  assert.equal(database.members.length, 1);
});

test("racing Yes and No answers cannot both use the same invitation", async () => {
  const { inviteMember, acceptInvitation, declineInvitation } = await services;
  await inviteMember(owner, business.id, staffEmail, now);
  const id = firstInvitationId();
  const results = await Promise.allSettled([
    declineInvitation(staff, id, now),
    acceptInvitation(staff, id, now),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(staffMemberships().length, 0);
});
