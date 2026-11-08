import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { CredentialAccount, LoginState } from "../types/auth";

// ---- In-memory replacements for the repository modules ----
// The service imports these files directly, so the test swaps the modules.

let account: CredentialAccount | null = null;
let accountWrites = 0;
let fakePasswordChecks = 0;
let racesToLose = 0;

function repositoryFile(name: string) {
  return pathToFileURL(resolve(`src/features/auth/repository/${name}.ts`)).href;
}

mock.module(repositoryFile("account-repository"), {
  namedExports: {
    async findAccountByEmail(email: string) {
      return account?.email === email ? structuredClone(account) : null;
    },
    async findUserById(id: string) {
      return account?.id === id
        ? { id: account.id, name: account.name, email: account.email }
        : null;
    },
    async createAccount(input: {
      email: string;
      name: string;
      passwordHash: string;
    }) {
      accountWrites++;
      account = {
        ...input,
        id: "user",
        failedLoginAttempts: 0,
        lockedUntil: null,
        loginVersion: 0,
      };
      return { id: account.id, email: account.email, name: account.name };
    },
    async saveLoginAttempt(id: string, version: number, state: LoginState) {
      if (racesToLose > 0) {
        racesToLose--;
        return false;
      }
      if (!account || account.id !== id || account.loginVersion !== version)
        return false;
      account = { ...account, ...state, loginVersion: version + 1 };
      return true;
    },
  },
});
mock.module(repositoryFile("password-hashing"), {
  namedExports: {
    hashPassword: async (password: string) => "hash:" + password,
    verifyPassword: async (password: string, hash: string) =>
      hash === "hash:" + password,
    runFakePasswordCheck: async () => {
      fakePasswordChecks++;
    },
  },
});

const service = import("./account-service");

beforeEach(() => {
  account = null;
  accountWrites = 0;
  fakePasswordChecks = 0;
  racesToLose = 0;
});

const now = new Date("2026-11-07T00:00:00Z");
const credentials = {
  name: "Felix",
  email: "Owner@Example.com",
  password: "safe-password",
};
const wrongPassword = { ...credentials, password: "wrong" };

test("signup stores a normalized local account and hash; returns no password or business", async () => {
  const { registerAccount } = await service;
  const user = await registerAccount(credentials);
  assert.deepEqual(user, {
    id: "user",
    name: "Felix",
    email: "owner@example.com",
  });
  assert.equal(account?.passwordHash, "hash:safe-password");
  assert.equal(accountWrites, 1);
});

test("invalid signup and login do not reach persistence", async () => {
  const { registerAccount, loginWithPassword } = await service;
  for (const input of [
    {},
    { ...credentials, name: "" },
    { ...credentials, password: "short" },
    { ...credentials, email: "bad" },
  ])
    await assert.rejects(registerAccount(input));
  assert.equal(accountWrites, 0);
  assert.equal(await loginWithPassword({}, now), null);
});

test("valid login returns safe identity; unknown and wrong passwords return the same null result", async () => {
  const { registerAccount, loginWithPassword } = await service;
  await registerAccount(credentials);
  assert.equal((await loginWithPassword(credentials, now))?.id, "user");
  assert.equal(await loginWithPassword(wrongPassword, now), null);
  assert.equal(
    await loginWithPassword(
      { ...credentials, email: "other@example.com" },
      now,
    ),
    null,
  );
  assert.equal(fakePasswordChecks, 1);
});

test("five failures lock the account for fifteen minutes and successful login resets state after expiry", async () => {
  const { registerAccount, loginWithPassword } = await service;
  await registerAccount(credentials);
  for (let i = 0; i < 5; i++) await loginWithPassword(wrongPassword, now);
  assert.equal(account?.failedLoginAttempts, 5);
  assert.equal(account?.lockedUntil?.toISOString(), "2026-11-07T00:15:00.000Z");

  assert.equal(await loginWithPassword(credentials, now), null);
  assert.equal(account?.failedLoginAttempts, 5);

  assert.ok(
    await loginWithPassword(credentials, new Date("2026-11-07T00:15:00Z")),
  );
  assert.equal(account?.failedLoginAttempts, 0);
  assert.equal(account?.lockedUntil, null);
});

test("concurrent login updates are retried and a stale state cannot authenticate", async () => {
  const { registerAccount, loginWithPassword } = await service;
  await registerAccount(credentials);
  racesToLose = 1;
  assert.ok(await loginWithPassword(credentials, now));
  racesToLose = 3;
  assert.equal(await loginWithPassword(credentials, now), null);
});
