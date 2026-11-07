import assert from "node:assert/strict";
import { test } from "node:test";
import { authenticate, signup } from "./authentication";
import type {
  AccountRepository,
  CredentialAccount,
  PasswordHasher,
} from "../types/auth";
const now = new Date("2026-11-07T00:00:00Z");
function fixture() {
  let account: CredentialAccount | null = null;
  let dummyCalls = 0;
  let writes = 0;
  let conflicts = 0;
  const passwords: PasswordHasher = {
    hash: async (password) => "hash:" + password,
    verify: async (password, hash) => hash === "hash:" + password,
    dummyVerify: async () => {
      dummyCalls++;
    },
  };
  const repository: AccountRepository = {
    findCredentials: async (email) =>
      account?.email === email ? structuredClone(account) : null,
    findUser: async (id) =>
      account?.id === id
        ? { id: account.id, name: account.name, email: account.email }
        : null,
    async createAccount(input) {
      writes++;
      account = {
        ...input,
        id: "user",
        failedLoginAttempts: 0,
        lockedUntil: null,
        loginVersion: 0,
      };
      return { id: account.id, email: account.email, name: account.name };
    },
    async recordLogin(id, version, state) {
      if (conflicts > 0) {
        conflicts--;
        return false;
      }
      if (!account || account.id !== id || account.loginVersion !== version)
        return false;
      account = { ...account, ...state, loginVersion: version + 1 };
      return true;
    },
  };
  return {
    repository,
    passwords,
    account: () => account,
    writes: () => writes,
    dummy: () => dummyCalls,
    conflict: (count: number) => {
      conflicts = count;
    },
  };
}
const credentials = {
  name: "Felix",
  email: "Owner@Example.com",
  password: "safe-password",
};
test("signup stores a normalized local account and hash; returns no password or business", async () => {
  const f = fixture();
  const user = await signup(credentials, f.repository, f.passwords);
  assert.deepEqual(user, {
    id: "user",
    name: "Felix",
    email: "owner@example.com",
  });
  assert.equal(f.account()?.passwordHash, "hash:safe-password");
  assert.equal(f.writes(), 1);
});
test("invalid signup and login do not reach persistence", async () => {
  const f = fixture();
  for (const input of [
    {},
    { ...credentials, name: "" },
    { ...credentials, password: "short" },
    { ...credentials, email: "bad" },
  ])
    await assert.rejects(signup(input, f.repository, f.passwords));
  assert.equal(f.writes(), 0);
  assert.equal(await authenticate({}, now, f.repository, f.passwords), null);
});
test("valid login returns safe identity; unknown and wrong passwords return the same null result", async () => {
  const f = fixture();
  await signup(credentials, f.repository, f.passwords);
  assert.equal(
    (await authenticate(credentials, now, f.repository, f.passwords))?.id,
    "user",
  );
  assert.equal(
    await authenticate(
      { ...credentials, password: "wrong" },
      now,
      f.repository,
      f.passwords,
    ),
    null,
  );
  assert.equal(
    await authenticate(
      { ...credentials, email: "other@example.com" },
      now,
      f.repository,
      f.passwords,
    ),
    null,
  );
  assert.equal(f.dummy(), 1);
});
test("five failures lock the account for fifteen minutes and successful login resets state after expiry", async () => {
  const f = fixture();
  await signup(credentials, f.repository, f.passwords);
  for (let i = 0; i < 5; i++)
    await authenticate(
      { ...credentials, password: "wrong" },
      now,
      f.repository,
      f.passwords,
    );
  assert.equal(f.account()?.failedLoginAttempts, 5);
  assert.equal(
    f.account()?.lockedUntil?.toISOString(),
    "2026-11-07T00:15:00.000Z",
  );
  assert.equal(
    await authenticate(credentials, now, f.repository, f.passwords),
    null,
  );
  assert.equal(f.account()?.failedLoginAttempts, 5);
  assert.ok(
    await authenticate(
      credentials,
      new Date("2026-11-07T00:15:00Z"),
      f.repository,
      f.passwords,
    ),
  );
  assert.equal(f.account()?.failedLoginAttempts, 0);
  assert.equal(f.account()?.lockedUntil, null);
});
test("concurrent login updates are retried and a stale state cannot authenticate", async () => {
  const f = fixture();
  await signup(credentials, f.repository, f.passwords);
  f.conflict(1);
  assert.ok(await authenticate(credentials, now, f.repository, f.passwords));
  f.conflict(3);
  assert.equal(
    await authenticate(credentials, now, f.repository, f.passwords),
    null,
  );
});
test("a failed password after lock expiry starts a fresh bounded attempt count", async () => {
  const f = fixture();
  await signup(credentials, f.repository, f.passwords);
  for (let i = 0; i < 5; i++)
    await authenticate(
      { ...credentials, password: "bad" },
      now,
      f.repository,
      f.passwords,
    );
  await authenticate(
    { ...credentials, password: "bad" },
    new Date("2026-11-07T00:16:00Z"),
    f.repository,
    f.passwords,
  );
  assert.equal(f.account()?.failedLoginAttempts, 1);
  assert.equal(f.account()?.lockedUntil, null);
});
