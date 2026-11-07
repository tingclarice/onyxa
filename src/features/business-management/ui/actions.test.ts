import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Actor, BusinessProfileInput } from "../types/business";

class TestRedirect extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}
let actor: Actor | null = null;
let storeCalls = 0;
let revalidations = 0;
let writtenSelection: unknown;
let insertedOwner: unknown;
let insertedMember: unknown;
let closedInvites = 0;
const invitation = {
  id: "bdf50100-0000-4000-8000-000000000002",
  businessId: "bdf50100-0000-4000-8000-000000000001",
  businessName: "Test business",
  invitedByMemberId: "owner-member",
  inviterIsOwner: true,
  email: "staff@example.com",
  emailKey: "staff@example.com",
  role: "STAFF",
  expiresAt: "2099-11-14T00:00:00Z",
  acceptedAt: null,
  revokedAt: null,
};
const persistence = {
  async findRecipientInvitation(id: string, email: string) {
    return id === invitation.id && email === invitation.email
      ? invitation
      : null;
  },
  async findMembership() {
    return null;
  },
  async closeInvitation() {
    closedInvites++;
    return 1;
  },
  async saveMembership(
    businessId: string,
    userId: string,
    email: string,
    role: string,
  ) {
    insertedMember = { businessId, userId, email, role };
  },
  async createBusiness(profile: BusinessProfileInput, owner: unknown) {
    insertedOwner = owner;
    return { id: "bdf50100-0000-4000-8000-000000000001", ...profile };
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
        delete() {},
        set(_name: string, value: string, options: unknown) {
          writtenSelection = { value, options };
        },
      };
    },
  },
});
mock.module(pathToFileURL(resolve("src/features/auth/server.ts")).href, {
  namedExports: {
    async getCurrentUser() {
      return actor;
    },
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
      createBusinessStore() {
        storeCalls++;
        return {
          ...persistence,
          async transaction<T>(
            run: (repository: typeof persistence) => Promise<T>,
          ) {
            return run(persistence);
          },
        };
      },
    },
  },
);
const actions = import("./actions");
beforeEach(() => {
  actor = null;
  storeCalls = 0;
  revalidations = 0;
  writtenSelection = undefined;
  insertedOwner = undefined;
  insertedMember = undefined;
  closedInvites = 0;
});

test("every business action authenticates direct calls before any persistence", async () => {
  const entryPoints = await actions;
  for (const action of [
    entryPoints.createBusinessAction,
    entryPoints.switchBusinessAction,
    entryPoints.inviteMemberAction,
    entryPoints.respondInvitationAction,
    entryPoints.revokeInvitationAction,
    entryPoints.updateProfileAction,
    entryPoints.updateAlertsAction,
  ]) {
    await assert.rejects(
      action(null, new FormData()),
      (error: unknown) =>
        error instanceof TestRedirect && error.destination === "/masuk",
    );
  }
  assert.equal(storeCalls, 0);
});

test("invalid forms never reach the database or revalidate UI", async () => {
  actor = { id: "real-user", email: "owner@example.com" };
  const entryPoints = await actions;
  for (const action of [
    entryPoints.createBusinessAction,
    entryPoints.switchBusinessAction,
    entryPoints.inviteMemberAction,
    entryPoints.respondInvitationAction,
    entryPoints.revokeInvitationAction,
    entryPoints.updateProfileAction,
    entryPoints.updateAlertsAction,
  ]) {
    assert.equal((await action(null, new FormData())).status, "error");
  }
  assert.equal(storeCalls, 0);
  assert.equal(revalidations, 0);
});

test("creation derives the owner from the session and sets an HTTP-only selection", async () => {
  actor = { id: "real-user", email: "Owner@Example.com" };
  const form = new FormData();
  form.set("name", "Warung Sari");
  form.set("businessType", "STORE");
  form.set("userId", "forged-user");
  form.set("role", "STAFF");
  await assert.rejects(
    (await actions).createBusinessAction(null, form),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/beranda",
  );
  assert.deepEqual(insertedOwner, {
    userId: "real-user",
    email: "owner@example.com",
    role: "OWNER",
  });
  assert.deepEqual(writtenSelection, {
    value: "real-user:bdf50100-0000-4000-8000-000000000001",
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

test("expected and unexpected failures return safe messages", async () => {
  const { perform } = await import("./action-runtime");
  const { BusinessError } = await import("../types/business");
  const denied = await perform(async () => {
    throw new BusinessError("owner_required");
  });
  assert(!denied.ok && denied.result.message.includes("pemilik"));
  const failed = await perform(async () => {
    throw new Error("postgresql://private-password@host");
  });
  assert(!failed.ok && !failed.result.message.includes("private-password"));
});

test("responding to another account's invitation is denied without leaking business details", async () => {
  actor = { id: "other-user", email: "other@example.com" };
  const form = new FormData();
  form.set("invitationId", invitation.id);
  form.set("decision", "accept");
  form.set("email", invitation.email);
  const result = await (await actions).respondInvitationAction(null, form);
  assert.equal(result.status, "error");
  assert.equal(JSON.stringify(result).includes(invitation.businessName), false);
  assert.equal(closedInvites, 0);
  assert.equal(insertedMember, undefined);
});

test("Yes needs no code or cookie and grants only the trusted recipient a staff role", async () => {
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
  assert.equal(closedInvites, 0);
  form.set("invitationId", invitation.id);
  await assert.rejects(
    (await actions).respondInvitationAction(null, form),
    (error: unknown) =>
      error instanceof TestRedirect && error.destination === "/beranda",
  );
  assert.deepEqual(insertedMember, {
    businessId: invitation.businessId,
    userId: "staff-user",
    email: invitation.email,
    role: "STAFF",
  });
  assert.equal(closedInvites, 1);
});

test("No closes the invitation without creating a membership or selecting a business", async () => {
  actor = { id: "staff-user", email: invitation.email };
  const form = new FormData();
  form.set("invitationId", invitation.id);
  form.set("decision", "dismiss");
  assert.equal(
    (await (await actions).respondInvitationAction(null, form)).status,
    "success",
  );
  assert.equal(closedInvites, 1);
  assert.equal(insertedMember, undefined);
  assert.equal(writtenSelection, undefined);
  assert.equal(revalidations, 1);
});
