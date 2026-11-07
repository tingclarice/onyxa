// Tests the Server Functions with the real services and an in-memory database.
import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Actor } from "../types/business";
import {
  database,
  installInMemoryDatabase,
  resetDatabase,
} from "../testing/in-memory-database";
import {
  business,
  openInvitation,
  ownerMembership,
} from "../testing/sample-data";

class TestRedirect extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}
let actor: Actor | null = null;
let revalidations = 0;
let savedCookie: unknown;

installInMemoryDatabase();
mock.module("next/navigation", {
  namedExports: {
    redirect(destination: string): never {
      throw new TestRedirect(destination);
    },
  },
});
mock.module("next/cache", {
  namedExports: {
    revalidatePath() {
      revalidations++;
    },
  },
});
mock.module("next/headers", {
  namedExports: {
    async cookies() {
      return {
        set(_name: string, value: string, options: unknown) {
          savedCookie = { value, options };
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
const actions = import("./actions");

const businessId = "bdf50100-0000-4000-8000-000000000001";
const invitationId = "bdf50100-0000-4000-8000-000000000002";
const testBusiness = { ...business, id: businessId };
const invitation = {
  ...openInvitation,
  id: invitationId,
  businessId,
  expiresAt: "2099-11-14T00:00:00Z",
};

beforeEach(() => {
  resetDatabase({
    businesses: [testBusiness],
    members: [{ ...ownerMembership, businessId, business: testBusiness }],
    invitations: [invitation],
  });
  actor = null;
  revalidations = 0;
  savedCookie = undefined;
});

async function allActions() {
  const a = await actions;
  return [
    a.createBusinessAction,
    a.switchBusinessAction,
    a.inviteMemberAction,
    a.respondInvitationAction,
    a.revokeInvitationAction,
    a.updateProfileAction,
    a.updateAlertsAction,
  ];
}

test("every business action checks the login before touching the database", async () => {
  for (const action of await allActions()) {
    await assert.rejects(
      action(null, new FormData()),
      (error: unknown) =>
        error instanceof TestRedirect && error.destination === "/masuk",
    );
  }
  assert.equal(database.calls, 0);
});

test("invalid forms never reach the database or refresh the page", async () => {
  actor = { id: "real-user", email: "owner@example.com" };
  for (const action of await allActions()) {
    assert.equal((await action(null, new FormData())).status, "error");
  }
  assert.equal(database.calls, 0);
  assert.equal(revalidations, 0);
});

test("creating a business takes the owner from the session (not the form) and saves an HTTP-only cookie", async () => {
  actor = { id: "real-user", email: "Owner@Example.com" };
  const form = new FormData();
  form.set("name", "Warung Baru");
  form.set("businessType", "STORE");
  form.set("userId", "forged-user");
  form.set("role", "STAFF");
  await assert.rejects(
    (await actions).createBusinessAction(null, form),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/beranda",
  );
  const owner = database.members.find((m) => m.userId === "real-user");
  assert.equal(owner?.role, "OWNER");
  assert.equal(owner?.email, "owner@example.com");
  assert.equal(database.members.some((m) => m.userId === "forged-user"), false);
  assert.deepEqual(savedCookie, {
    value: `real-user:${owner?.businessId}`,
    options: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 2592000,
    },
  });
  assert.equal(revalidations, 1);
});

test("expected and unexpected errors become safe messages", async () => {
  const { toErrorResult } = await import("./error-messages");
  const { BusinessError } = await import("../types/business");
  assert(toErrorResult(new BusinessError("owner_required")).message.includes("pemilik"));
  const hidden = toErrorResult(new Error("postgresql://private-password@host"));
  assert.equal(hidden.message.includes("private-password"), false);
});

test("answering another account's invitation is denied without leaking the business name", async () => {
  actor = { id: "other-user", email: "other@example.com" };
  const form = new FormData();
  form.set("invitationId", invitationId);
  form.set("decision", "accept");
  form.set("email", invitation.email);
  const result = await (await actions).respondInvitationAction(null, form);
  assert.equal(result.status, "error");
  assert.equal(JSON.stringify(result).includes(invitation.businessName), false);
  assert.equal(database.invitations[0].acceptedAt, null);
  assert.equal(database.members.length, 1);
});

test("Yes needs no code or cookie and only makes the logged-in recipient STAFF", async () => {
  actor = { id: "staff-user", email: "STAFF@example.com" };
  const form = new FormData();
  form.set("decision", "accept");
  form.set("invitationId", "bdf50100-0000-4000-8000-000000000099");
  form.set("userId", "forged-user");
  form.set("role", "OWNER");
  assert.equal(
    (await (await actions).respondInvitationAction(null, form)).status,
    "error",
  );

  form.set("invitationId", invitationId);
  await assert.rejects(
    (await actions).respondInvitationAction(null, form),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/beranda",
  );
  const joined = database.members.find((m) => m.userId === "staff-user");
  assert.deepEqual(
    { businessId: joined?.businessId, email: joined?.email, role: joined?.role },
    { businessId, email: invitation.email, role: "STAFF" },
  );
  assert.ok(database.invitations[0].acceptedAt);
});

test("No closes the invitation without joining or selecting a business", async () => {
  actor = { id: "staff-user", email: invitation.email };
  const form = new FormData();
  form.set("invitationId", invitationId);
  form.set("decision", "dismiss");
  assert.equal(
    (await (await actions).respondInvitationAction(null, form)).status,
    "success",
  );
  assert.ok(database.invitations[0].revokedAt);
  assert.equal(database.members.length, 1);
  assert.equal(savedCookie, undefined);
  assert.equal(revalidations, 1);
});
