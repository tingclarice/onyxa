// Tests the server-side reads used by pages, with an in-memory database.
import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Actor, Membership } from "../types/business";
import {
  database,
  installInMemoryDatabase,
  resetDatabase,
} from "../testing/in-memory-database";
import { business, openInvitation } from "../testing/sample-data";

class TestRedirect extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}
const businessId = "bdf50100-0000-4000-8000-000000000001";
const otherBusinessId = "bdf50100-0000-4000-8000-000000000002";
let actor: Actor | null = null;
let cookieValue: string | undefined;
let receiptReads = 0;

const membership: Membership = {
  id: "member",
  businessId,
  userId: "user",
  email: "staff@example.com",
  role: "STAFF",
  removedAt: null,
  business: { ...business, id: businessId },
};
const secondMembership: Membership = {
  ...membership,
  id: "second-member",
  businessId: otherBusinessId,
  business: { ...business, id: otherBusinessId },
};

installInMemoryDatabase();
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
      return { get: () => (cookieValue ? { value: cookieValue } : undefined) };
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
    resolve("src/features/invoice-processing/repository/demo-receipt-reader.ts"),
  ).href,
  {
    namedExports: {
      async readReceiptFromImage() {
        receiptReads++;
        return {};
      },
    },
  },
);
const queries = import("./queries");

beforeEach(() => {
  resetDatabase();
  actor = { id: "user", email: "Staff@Example.com" };
  cookieValue = undefined;
  receiptReads = 0;
});

test("an account without a business stays logged in, and business-only actions redirect", async () => {
  const { getBusinessWorkspace, requireActiveBusiness } = await queries;
  assert.equal((await getBusinessWorkspace()).active, null);
  await assert.rejects(
    requireActiveBusiness(),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/beranda",
  );
  const { scanReceiptAction } = await import(
    "@/features/invoice-processing/ui/actions"
  );
  await assert.rejects(
    scanReceiptAction(),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/beranda",
  );
  assert.equal(receiptReads, 0);
});

test("the saved business cookie belongs to one account and cannot invent a membership", async () => {
  const { getBusinessWorkspace } = await queries;
  resetDatabase({ members: [membership, secondMembership] });

  cookieValue = `another-user:${otherBusinessId}`;
  assert.equal((await getBusinessWorkspace()).active?.businessId, businessId);

  cookieValue = `user:${otherBusinessId}`;
  assert.equal(
    (await getBusinessWorkspace()).active?.businessId,
    otherBusinessId,
  );

  resetDatabase();
  assert.equal((await getBusinessWorkspace()).active, null);
});

test("the inbox email always comes from the trusted session, never from a cookie", async () => {
  const { getBusinessWorkspace } = await queries;
  resetDatabase({
    invitations: [
      { ...openInvitation, expiresAt: "2099-01-01T00:00:00Z" },
      {
        ...openInvitation,
        id: "other",
        email: "other@example.com",
        emailKey: "other@example.com",
        expiresAt: "2099-01-01T00:00:00Z",
      },
    ],
  });
  cookieValue = "forged-user:forged-business";
  const staffInbox = (await getBusinessWorkspace()).invitations;
  assert.deepEqual(staffInbox.map((i) => i.emailKey), ["staff@example.com"]);

  actor = { id: "other-user", email: "other@example.com" };
  const otherInbox = (await getBusinessWorkspace()).invitations;
  assert.deepEqual(otherInbox.map((i) => i.emailKey), ["other@example.com"]);

  actor = null;
  await assert.rejects(
    getBusinessWorkspace(),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/masuk",
  );
  assert.ok(database.calls > 0);
});
