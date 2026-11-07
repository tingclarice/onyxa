import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Actor, Membership } from "../types/business";

class TestRedirect extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}
const businessId = "bdf50100-0000-4000-8000-000000000001";
const otherBusinessId = "bdf50100-0000-4000-8000-000000000002";
let actor: Actor | null = null;
let memberships: Membership[] = [];
let selection: string | undefined;
let providerCalls = 0;
let recipientQuery: string | undefined;
const member: Membership = {
  id: "member",
  businessId,
  userId: "user",
  email: "staff@example.com",
  role: "STAFF",
  removedAt: null,
  business: {
    id: businessId,
    name: "Kedai Andi",
    businessType: "OTHER",
    priceIncreaseThresholdPercent: 5,
    priceIncreaseAlertsEnabled: true,
    slowMovingAlertsEnabled: true,
  },
};
mock.module("server-only", {});
mock.module("next/navigation", {
  namedExports: {
    redirect(destination: string): never {
      throw new TestRedirect(destination);
    },
  },
});
mock.module("next/headers", {
  namedExports: {
    async cookies() {
      return {
        get() {
          return selection ? { value: selection } : undefined;
        },
      };
    },
  },
});
mock.module(pathToFileURL(resolve("src/features/auth/server.ts")).href, {
  namedExports: {
    async requireUser() {
      if (!actor) throw new TestRedirect("/masuk");
      return actor;
    },
  },
});
mock.module(
  pathToFileURL(
    resolve("src/features/business-management/repository/prisma-business.ts"),
  ).href,
  {
    namedExports: {
      createBusinessStore: () => ({
        async listMemberships(userId: string) {
          return memberships.filter((member) => member.userId === userId);
        },
        async listInvitationsForEmail(email: string) {
          recipientQuery = email;
          return [];
        },
      }),
    },
  },
);
mock.module(
  pathToFileURL(
    resolve("src/features/invoice-processing/services/mock-receipts.ts"),
  ).href,
  {
    namedExports: {
      async getMockReceipt() {
        providerCalls++;
        return {};
      },
    },
  },
);
const queries = import("./queries");
beforeEach(() => {
  actor = { id: "user", email: "Staff@Example.com", emailVerified: true };
  memberships = [];
  selection = undefined;
  providerCalls = 0;
  recipientQuery = undefined;
});

test("a business-free account stays authenticated and business-only operations redirect", async () => {
  const entries = await queries;
  assert.equal((await entries.getBusinessWorkspace()).active, null);
  await assert.rejects(
    entries.requireActiveBusiness(),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/beranda",
  );
  const { scanReceiptAction } = await import(
    "@/features/invoice-processing/services/actions"
  );
  await assert.rejects(
    scanReceiptAction(),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/beranda",
  );
  assert.equal(providerCalls, 0);
});

test("selection cookies are account-bound and cannot invent membership", async () => {
  memberships = [
    member,
    {
      ...member,
      id: "second-member",
      businessId: otherBusinessId,
      business: { ...member.business, id: otherBusinessId },
    },
  ];
  selection = `another-user:${otherBusinessId}`;
  assert.equal(
    (await (await queries).getBusinessWorkspace()).active?.businessId,
    businessId,
  );
  selection = `user:${otherBusinessId}`;
  assert.equal(
    (await (await queries).getBusinessWorkspace()).active?.businessId,
    otherBusinessId,
  );
  memberships = [];
  assert.equal((await (await queries).getBusinessWorkspace()).active, null);
});

test("inbox identity comes from the verified session rather than cookies", async () => {
  selection = "forged-user:forged-business";
  await (await queries).getBusinessWorkspace();
  assert.equal(recipientQuery, "staff@example.com");
  actor = { id: "user", email: "staff@example.com", emailVerified: false };
  recipientQuery = undefined;
  await (await queries).getBusinessWorkspace();
  assert.equal(recipientQuery, undefined);
});
