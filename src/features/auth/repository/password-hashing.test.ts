import assert from "node:assert/strict";
import { mock, test } from "node:test";
mock.module("server-only", {});
const hashing = import("./password-hashing");

test("scrypt salts independently, verifies only the correct password, and rejects malformed hashes", async () => {
  const { hashPassword, verifyPassword } = await hashing;
  const first = await hashPassword("correct password");
  const second = await hashPassword("correct password");
  assert.notEqual(first, second);
  assert.equal(first.includes("correct password"), false);
  assert.equal(await verifyPassword("correct password", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  for (const value of [
    "",
    "scrypt-v1$broken",
    first.replace("scrypt-v1", "scrypt-v2"),
  ])
    assert.equal(await verifyPassword("correct password", value), false);
});
