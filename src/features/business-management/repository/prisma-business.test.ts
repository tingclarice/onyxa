import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma } from "@/generated/prisma/client";

const calls: { operation: string; input: unknown }[] = [];
const business = {
  id: "business",
  name: "Warung Sari",
  businessType: "STORE",
  priceIncreaseThresholdPercent: { toNumber: () => 5 },
  priceIncreaseAlertsEnabled: true,
  slowMovingAlertsEnabled: true,
};
const member = {
  id: "member",
  businessId: business.id,
  userId: "user",
  email: "staff@example.com",
  role: "STAFF",
  removedAt: null,
  business,
};
const invitation = {
  id: "invite",
  businessId: business.id,
  invitedByMemberId: "owner",
  email: "staff@example.com",
  emailKey: "staff@example.com",
  role: "STAFF",
  expiresAt: new Date("2026-11-14T00:00:00Z"),
  acceptedAt: null,
  revokedAt: null,
  business,
  invitedBy: { role: "OWNER", removedAt: null },
};
let failures = 0;
let failureCode = "P2034";
let attempts = 0;
const transaction = {
  business: {
    async create(input: unknown) {
      calls.push({ operation: "business.create", input });
      return business;
    },
  },
  businessMember: {
    async findMany(input: unknown) {
      calls.push({ operation: "member.findMany", input });
      return [member];
    },
    async findUnique(input: unknown) {
      calls.push({ operation: "member.findUnique", input });
      return member;
    },
    async upsert(input: unknown) {
      calls.push({ operation: "member.upsert", input });
      return { id: member.id };
    },
  },
  businessInvitation: {
    async findMany(input: unknown) {
      calls.push({ operation: "invite.findMany", input });
      return [invitation];
    },
    async findFirst(input: unknown) {
      calls.push({ operation: "invite.findFirst", input });
      return invitation;
    },
    async updateMany(input: unknown) {
      calls.push({ operation: "invite.updateMany", input });
      return { count: 1 };
    },
  },
};
mock.module("server-only", {});
mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
  namedExports: {
    getPrisma: () => ({
      ...transaction,
      async $transaction<T>(
        run: (client: typeof transaction) => Promise<T>,
        options: unknown,
      ) {
        attempts++;
        calls.push({ operation: "transaction", input: options });
        if (attempts <= failures)
          throw new Prisma.PrismaClientKnownRequestError(
            "private driver detail",
            { code: failureCode, clientVersion: "7.10.1" },
          );
        return run(transaction);
      },
    }),
  },
});
const adapter = import("./prisma-business");
beforeEach(() => {
  calls.length = 0;
  failures = 0;
  attempts = 0;
  failureCode = "P2034";
});

test("membership reads are user/tenant scoped and map decimals to serializable numbers", async () => {
  const store = (await adapter).createBusinessStore();
  const result = await store.findMembership("business", "user");
  assert.equal(result?.business.priceIncreaseThresholdPercent, 5);
  const input = calls[0].input;
  assert(typeof input === "object" && input !== null && "where" in input);
  assert.deepEqual(input.where, {
    businessId_userId: { businessId: "business", userId: "user" },
  });
});

test("recipient reads include the invitation ID and trusted email", async () => {
  const result = await (await adapter)
    .createBusinessStore()
    .findRecipientInvitation("invite", "staff@example.com");
  const input = calls[0].input;
  assert(
    typeof input === "object" &&
      input !== null &&
      "where" in input &&
      "select" in input,
  );
  assert.deepEqual(input.where, {
    id: "invite",
    emailKey: "staff@example.com",
  });
  assert.equal(JSON.stringify(input.select).includes("tokenHash"), false);
  assert.equal(result?.expiresAt, "2026-11-14T00:00:00.000Z");
  assert.equal(result?.inviterIsOwner, true);
  assert.equal(result && "tokenHash" in result, false);
});

test("inbox reads are scoped to the recipient and unused invitations", async () => {
  const result = await (await adapter)
    .createBusinessStore()
    .listRecipientInvitations("staff@example.com");
  const input = calls[0].input;
  assert(
    typeof input === "object" &&
      input !== null &&
      "where" in input &&
      "orderBy" in input,
  );
  assert.deepEqual(input.where, {
    emailKey: "staff@example.com",
    acceptedAt: null,
    revokedAt: null,
  });
  assert.deepEqual(input.orderBy, { createdAt: "desc" });
  assert.equal(result[0].businessName, business.name);
});

test("business and owner creation use a single nested persistence write", async () => {
  const owner = {
    userId: "user",
    email: "owner@example.com",
    role: "OWNER" as const,
  };
  await (await adapter)
    .createBusinessStore()
    .createBusiness({ name: "Warung", businessType: "STORE" }, owner);
  const input = calls[0].input;
  assert(typeof input === "object" && input !== null && "data" in input);
  assert.deepEqual(input.data, {
    name: "Warung",
    businessType: "STORE",
    members: { create: owner },
  });
});

test("acceptance writes are conditional on tenant, unused state and expiry", async () => {
  const now = new Date("2026-11-07T00:00:00Z");
  await (await adapter)
    .createBusinessStore()
    .closeInvitation("invite", "business", now, "accepted");
  const input = calls[0].input;
  assert(typeof input === "object" && input !== null && "where" in input);
  assert.deepEqual(input.where, {
    id: "invite",
    businessId: "business",
    acceptedAt: null,
    revokedAt: null,
    expiresAt: { gt: now },
  });
});

test("serializable conflicts retry after rollback and unrelated failures do not retry", async () => {
  const store = (await adapter).createBusinessStore();
  failures = 2;
  assert.equal(
    await store.transaction(
      async (repository) => (await repository.listMemberships("user")).length,
    ),
    1,
  );
  assert.equal(attempts, 3);
  assert.deepEqual(calls.find((c) => c.operation === "transaction")?.input, {
    isolationLevel: "Serializable",
  });
  attempts = 0;
  failures = 1;
  failureCode = "P2002";
  await assert.rejects(store.transaction(async () => true));
  assert.equal(attempts, 1);
});
