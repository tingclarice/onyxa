// Checks the Prisma queries: correct scope (business / user / email) and mapping.
import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const calls: { operation: string; input: unknown }[] = [];
const businessRow = {
  id: "business",
  name: "Warung Sari",
  businessType: "STORE",
  priceIncreaseThresholdPercent: { toNumber: () => 5 },
  priceIncreaseAlertsEnabled: true,
  slowMovingAlertsEnabled: true,
};
const memberRow = {
  id: "member",
  businessId: businessRow.id,
  userId: "user",
  email: "staff@example.com",
  role: "STAFF",
  removedAt: null,
  business: businessRow,
};
const invitationRow = {
  id: "invite",
  businessId: businessRow.id,
  invitedByMemberId: "owner",
  email: "staff@example.com",
  emailKey: "staff@example.com",
  role: "STAFF",
  expiresAt: new Date("2026-11-14T00:00:00Z"),
  acceptedAt: null,
  revokedAt: null,
  business: businessRow,
  invitedBy: { role: "OWNER", removedAt: null },
};
function record(operation: string, result: unknown) {
  return async (input: unknown) => {
    calls.push({ operation, input });
    return result;
  };
}
mock.module("server-only", {});
mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
  namedExports: {
    getPrisma: () => ({
      business: { create: record("business.create", businessRow) },
      businessMember: {
        findMany: record("member.findMany", [memberRow]),
        findUnique: record("member.findUnique", memberRow),
      },
      businessInvitation: {
        findMany: record("invite.findMany", [invitationRow]),
        findFirst: record("invite.findFirst", invitationRow),
        updateMany: record("invite.updateMany", { count: 1 }),
      },
    }),
  },
});
const repositories = Promise.all([
  import("./business-repository"),
  import("./membership-repository"),
  import("./invitation-repository"),
]).then(([business, membership, invitation]) => ({
  ...business,
  ...membership,
  ...invitation,
}));
beforeEach(() => {
  calls.length = 0;
});

function whereOf(index: number): unknown {
  const input = calls[index].input;
  assert(typeof input === "object" && input !== null && "where" in input);
  return input.where;
}

test("membership reads are scoped to user and business and turn decimals into numbers", async () => {
  const { findMembership } = await repositories;
  const result = await findMembership("business", "user");
  assert.equal(result?.business.priceIncreaseThresholdPercent, 5);
  assert.deepEqual(whereOf(0), {
    businessId_userId: { businessId: "business", userId: "user" },
  });
});

test("recipient reads include the invitation ID and the trusted email", async () => {
  const { findInvitationForRecipient } = await repositories;
  const result = await findInvitationForRecipient("invite", "staff@example.com");
  assert.deepEqual(whereOf(0), { id: "invite", emailKey: "staff@example.com" });
  assert.equal(result?.expiresAt, "2026-11-14T00:00:00.000Z");
  assert.equal(result?.inviterIsOwner, true);
  assert.equal(result && "tokenHash" in result, false);
});

test("the inbox is scoped to the recipient and unanswered invitations, newest first", async () => {
  const { listUnansweredInvitationsForRecipient } = await repositories;
  const result = await listUnansweredInvitationsForRecipient("staff@example.com");
  assert.deepEqual(whereOf(0), {
    emailKey: "staff@example.com",
    acceptedAt: null,
    revokedAt: null,
  });
  const input = calls[0].input;
  assert(typeof input === "object" && input !== null && "orderBy" in input);
  assert.deepEqual(input.orderBy, { createdAt: "desc" });
  assert.equal(result[0].businessName, businessRow.name);
});

test("the business and its owner are created in one nested write", async () => {
  const { createBusinessWithOwner } = await repositories;
  const owner = { userId: "user", email: "owner@example.com", role: "OWNER" as const };
  await createBusinessWithOwner({ name: "Warung", businessType: "STORE" }, owner);
  const input = calls[0].input;
  assert(typeof input === "object" && input !== null && "data" in input);
  assert.deepEqual(input.data, {
    name: "Warung",
    businessType: "STORE",
    members: { create: owner },
  });
});

test("accepting only updates an open invitation of the same business", async () => {
  const { markInvitationAccepted } = await repositories;
  const now = new Date("2026-11-07T00:00:00Z");
  await markInvitationAccepted("invite", "business", now);
  assert.deepEqual(whereOf(0), {
    id: "invite",
    businessId: "business",
    acceptedAt: null,
    revokedAt: null,
    expiresAt: { gt: now },
  });
});
