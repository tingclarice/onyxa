import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getPrisma } from "@/lib/prisma";

afterEach(async () => {
  await globalThis.onyxaPrisma?.$disconnect();
  globalThis.onyxaPrisma = undefined;
  delete process.env.DATABASE_URL;
});

test("database configuration is checked only when the client is requested", () => {
  delete process.env.DATABASE_URL;
  assert.throws(getPrisma, /Set DATABASE_URL/);
  assert.equal(globalThis.onyxaPrisma, undefined);
});

test("client construction is lazy and reuses the process connection pool", () => {
  // No query is made: nothing listens on this address.
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  const first = getPrisma();
  assert.equal(getPrisma(), first);
  assert.equal(globalThis.onyxaPrisma, first);
});
