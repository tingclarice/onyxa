import assert from "node:assert/strict";
import { mock, test } from "node:test";
mock.module("server-only", {});
const adapter = import("./passwords");
test("scrypt salts independently, verifies only the correct password, and rejects malformed hashes", async () => {
  const { passwords } = await adapter;
  const first = await passwords.hash("correct password");
  const second = await passwords.hash("correct password");
  assert.notEqual(first, second);
  assert.equal(first.includes("correct password"), false);
  assert.equal(await passwords.verify("correct password", first), true);
  assert.equal(await passwords.verify("wrong password", first), false);
  for (const value of [
    "",
    "scrypt-v1$broken",
    first.replace("scrypt-v1", "scrypt-v2"),
  ])
    assert.equal(await passwords.verify("correct password", value), false);
});
