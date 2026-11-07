import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BusinessError,
  type Actor,
  type Invitation,
  type Membership,
} from "../types/business";
import {
  createInvitationPlan,
  isPending,
  recipientDecision,
  requireMembership,
  requireOwner,
  selectMembership,
} from "./access";

const now = new Date("2026-11-07T00:00:00Z");
const actor: Actor = {
  id: "user",
  email: "owner@example.com",
};
const member: Membership = {
  id: "member",
  businessId: "business",
  userId: actor.id,
  email: actor.email ?? "",
  role: "OWNER",
  removedAt: null,
  business: {
    id: "business",
    name: "Warung Sari",
    businessType: "OTHER",
    priceIncreaseThresholdPercent: 5,
    priceIncreaseAlertsEnabled: true,
    slowMovingAlertsEnabled: true,
  },
};
const invitation: Invitation = {
  id: "invite",
  businessId: "business",
  businessName: "Warung Sari",
  invitedByMemberId: "owner-member",
  inviterIsOwner: true,
  email: "staff@example.com",
  emailKey: "staff@example.com",
  role: "STAFF",
  expiresAt: "2026-11-14T00:00:00Z",
  acceptedAt: null,
  revokedAt: null,
};

test("permissions reject removed members, other actors, other tenants, and staff owners", () => {
  for (const candidate of [
    null,
    { ...member, removedAt: now.toISOString() },
    { ...member, userId: "other" },
    { ...member, businessId: "other" },
  ]) {
    assert.throws(
      () => requireMembership(candidate, actor, "business"),
      (e: unknown) => e instanceof BusinessError && e.code === "not_member",
    );
  }
  assert.throws(
    () => requireOwner({ ...member, role: "STAFF" }, actor, "business"),
    (e: unknown) => e instanceof BusinessError && e.code === "owner_required",
  );
});

test("a forged selection never grants membership and removed rows are not selected", () => {
  assert.equal(selectMembership([], "foreign-business"), null);
  assert.equal(
    selectMembership([{ ...member, removedAt: now.toISOString() }], "business"),
    null,
  );
  assert.equal(
    selectMembership([member], "foreign-business")?.businessId,
    "business",
  );
});

test("expiry boundary, revoked, accepted and inactive-inviter invitations are not pending", () => {
  assert.equal(isPending(invitation, now), true);
  for (const update of [
    { expiresAt: now.toISOString() },
    { acceptedAt: now.toISOString() },
    { revokedAt: now.toISOString() },
    { inviterIsOwner: false },
  ]) {
    assert.equal(isPending({ ...invitation, ...update }, now), false);
  }
});

test("inviting normalizes email, defaults to staff, and grants seven days", () => {
  const result = createInvitationPlan(
    actor,
    member,
    "business",
    " STAFF@Example.com ",
    null,
    [],
    now,
    "hash",
  );
  assert.equal(result.emailKey, "staff@example.com");
  assert.equal(result.role, "STAFF");
  assert.equal(result.expiresAt.toISOString(), "2026-11-14T00:00:00.000Z");
});

test("existing members, duplicate invitations and self invitations are rejected", () => {
  assert.throws(
    () =>
      createInvitationPlan(
        actor,
        member,
        "business",
        "staff@example.com",
        member,
        [],
        now,
        "hash",
      ),
    (e: unknown) => e instanceof BusinessError && e.code === "already_member",
  );
  assert.throws(
    () =>
      createInvitationPlan(
        actor,
        member,
        "business",
        "staff@example.com",
        null,
        [invitation],
        now,
        "hash",
      ),
    (e: unknown) => e instanceof BusinessError && e.code === "already_invited",
  );
  assert.throws(
    () =>
      createInvitationPlan(
        actor,
        member,
        "business",
        "OWNER@example.com",
        null,
        [],
        now,
        "hash",
      ),
    (e: unknown) =>
      e instanceof BusinessError && e.code === "cannot_invite_self",
  );
});

test("acceptance requires the targeted account email even after secret lookup", () => {
  assert.throws(
    () =>
      recipientDecision(actor, invitation, null, now, "accept", invitation.id),
    BusinessError,
  );
  assert.throws(
    () =>
      recipientDecision(
        { ...actor, email: null },
        invitation,
        null,
        now,
        "accept",
        invitation.id,
      ),
    (e: unknown) => e instanceof BusinessError && e.code === "missing_email",
  );
  assert.equal(
    recipientDecision(
      { ...actor, email: "STAFF@example.com" },
      invitation,
      null,
      now,
      "accept",
      invitation.id,
    ),
    "accept",
  );
});
