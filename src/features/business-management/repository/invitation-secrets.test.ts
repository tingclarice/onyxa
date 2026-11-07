import assert from "node:assert/strict";
import { mock, test } from "node:test";
mock.module("server-only", {});

test("invitation codes have independent cryptographic entropy and only hash mappings persist", async () => {
  const { invitationSecrets } = await import("./invitation-secrets");
  const first = invitationSecrets.issue();
  const second = invitationSecrets.issue();
  assert.match(first.code, /^[a-f0-9]{64}$/);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.code, second.code);
  assert.notEqual(first.code, first.hash);
  assert.equal(invitationSecrets.hash(first.code), first.hash);
  assert.notEqual(invitationSecrets.hash(second.code), first.hash);
});
