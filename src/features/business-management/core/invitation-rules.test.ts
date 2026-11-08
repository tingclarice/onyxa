import assert from "node:assert/strict";
import { test } from "node:test";
import { BusinessError } from "../types/business";
import {
  buildNewInvitation,
  checkCanInviteEmail,
  checkInvitationIsForUser,
  isInvitationOpen,
} from "./invitation-rules";
import {
  now,
  openInvitation,
  owner,
  ownerMembership,
  staff,
} from "../testing/sample-data";

function hasCode(code: string) {
  return (error: unknown) =>
    error instanceof BusinessError && error.code === code;
}

test("expired, revoked, accepted and inactive-inviter invitations are not open", () => {
  assert.equal(isInvitationOpen(openInvitation, now), true);
  for (const change of [
    { expiresAt: now.toISOString() },
    { acceptedAt: now.toISOString() },
    { revokedAt: now.toISOString() },
    { inviterIsOwner: false },
  ]) {
    assert.equal(isInvitationOpen({ ...openInvitation, ...change }, now), false);
  }
});

test("a new invitation normalizes the email, is always STAFF, and lasts seven days", () => {
  const invitation = buildNewInvitation(
    "business",
    ownerMembership,
    " STAFF@Example.com ",
    now,
  );
  assert.equal(invitation.emailKey, "staff@example.com");
  assert.equal(invitation.role, "STAFF");
  assert.equal(invitation.expiresAt.toISOString(), "2026-11-14T00:00:00.000Z");
});

test("existing members, duplicate invitations and self invitations are rejected", () => {
  assert.throws(
    () => checkCanInviteEmail(owner, "staff@example.com", ownerMembership, [], now),
    hasCode("already_member"),
  );
  assert.throws(
    () =>
      checkCanInviteEmail(owner, "staff@example.com", null, [openInvitation], now),
    hasCode("already_invited"),
  );
  assert.throws(
    () => checkCanInviteEmail(owner, "OWNER@example.com", null, [], now),
    hasCode("cannot_invite_self"),
  );
});

test("only the invited email can answer, and only the displayed invitation ID", () => {
  assert.throws(
    () => checkInvitationIsForUser(openInvitation, openInvitation.id, owner),
    hasCode("invite_unavailable"),
  );
  assert.throws(
    () => checkInvitationIsForUser(openInvitation, "other-id", staff),
    hasCode("invite_unavailable"),
  );
  assert.throws(
    () =>
      checkInvitationIsForUser(openInvitation, openInvitation.id, {
        ...staff,
        email: null,
      }),
    hasCode("missing_email"),
  );
  assert.equal(
    checkInvitationIsForUser(openInvitation, openInvitation.id, {
      ...staff,
      email: "STAFF@example.com",
    }),
    openInvitation,
  );
});
