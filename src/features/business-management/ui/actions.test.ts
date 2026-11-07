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
const persistence = {
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
        set(_name: string, value: string, options: unknown) {
          writtenSelection = { value, options };
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
  actor = { id: "real-user", email: "owner@example.com", emailVerified: true };
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
  actor = { id: "real-user", email: "Owner@Example.com", emailVerified: true };
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
