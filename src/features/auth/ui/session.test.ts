import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CredentialsSignin } from "next-auth";
import type { AuthUser } from "../types/auth";

const id = "bdf50100-0000-4000-8000-000000000001";
let session: unknown = null;
let user: AuthUser | null = null;
let signinError: Error | null = null;
let created = 0;
let reads = 0;
const deleted: string[] = [];
const invalidations: string[] = [];
class TestRedirect extends Error {}
mock.module("server-only", {});
mock.module("next/headers", {
  namedExports: {
    async cookies() {
      return {
        delete(name: string) {
          deleted.push(name);
        },
      };
    },
  },
});
mock.module("next/cache", {
  namedExports: {
    revalidatePath(path: string) {
      invalidations.push(path);
    },
  },
});
mock.module("next/navigation", {
  namedExports: {
    redirect(path: string): never {
      throw new TestRedirect(path);
    },
  },
});
mock.module(pathToFileURL(resolve("src/features/auth/ui/authjs.ts")).href, {
  namedExports: {
    async auth() {
      return session;
    },
    async signIn() {
      if (signinError) throw signinError;
      return "/beranda";
    },
    async signOut() {
      return { redirect: "/masuk" };
    },
  },
});
mock.module(
  pathToFileURL(resolve("src/features/auth/repository/passwords.ts")).href,
  { namedExports: { passwords: { hash: async () => "hashed" } } },
);
mock.module(
  pathToFileURL(resolve("src/features/auth/repository/prisma-accounts.ts"))
    .href,
  {
    namedExports: {
      createAccountRepository: () => ({
        async findUser(trustedId: string) {
          reads++;
          assert.equal(trustedId, id);
          return user;
        },
        async createAccount() {
          created++;
          return { id, email: "user@example.com", name: "User" };
        },
      }),
    },
  },
);
const queries = import("./session");
const actions = import("./actions");
beforeEach(() => {
  session = null;
  user = null;
  signinError = null;
  created = 0;
  reads = 0;
  deleted.length = 0;
  invalidations.length = 0;
});
test("anonymous, malformed and deleted-account sessions cannot access protected use cases", async () => {
  const { getCurrentUser, requireUser } = await queries;
  assert.equal(await getCurrentUser(), null);
  assert.equal(reads, 0);
  session = { user: { id: "forged" } };
  assert.equal(await getCurrentUser(), null);
  session = { user: { id } };
  assert.equal(await getCurrentUser(), null);
  await assert.rejects(requireUser(), TestRedirect);
});
test("trusted session ID resolves fresh identity from the account repository", async () => {
  session = { user: { id, email: "forged@example.com" } };
  user = { id, email: "real@example.com", name: "Real" };
  assert.deepEqual(await (await queries).requireUser(), user);
});
test("signup creates only an account and successful auth clears prior business selection", async () => {
  const result = await (
    await actions
  ).signupAction({
    name: "User",
    email: "user@example.com",
    password: "password123",
  });
  assert.equal(result.status, "authenticated");
  assert.equal(created, 1);
  assert.deepEqual(deleted, ["onyxa-active-business"]);
  assert.deepEqual(invalidations, ["/"]);
});
test("invalid signup never writes; credentials failures preserve selection and return safe errors", async () => {
  const entries = await actions;
  assert.equal((await entries.signupAction({})).code, "validation_failed");
  assert.equal(created, 0);
  signinError = new CredentialsSignin();
  const result = await entries.loginAction({
    email: "user@example.com",
    password: "wrong",
  });
  assert.equal(result.code, "invalid_credentials");
  assert.deepEqual(deleted, []);
  signinError = new Error("private-database-password");
  const safe = await entries.loginAction({
    email: "user@example.com",
    password: "wrong",
  });
  assert.equal(safe.code, "auth_unavailable");
  assert.equal(
    JSON.stringify(safe).includes("private-database-password"),
    false,
  );
});
test("logout clears business selection before redirecting to login", async () => {
  await assert.rejects((await actions).signOutAction(), TestRedirect);
  assert.deepEqual(deleted, ["onyxa-active-business"]);
});
