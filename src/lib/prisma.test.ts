import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getPrisma } from "@/lib/prisma";

afterEach(async () => {
  await globalThis.onyxaPrismaV3?.$disconnect?.();
  globalThis.onyxaPrismaV3 = undefined;
  delete process.env.SUPABASE_URL;
});

test("database configuration is checked only when the client is requested", () => {
  delete process.env.SUPABASE_URL;
  assert.throws(getPrisma, /Set SUPABASE_URL/);
  assert.equal(globalThis.onyxaPrismaV3, undefined);
});

test("client construction is lazy and reuses the process connection pool", () => {
  // No query is made: nothing listens on this address.
  process.env.SUPABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  const first = getPrisma();
  assert.equal(getPrisma(), first);
});

test("Supabase transaction reads carry tenant scope, pagination, and stable order", async (context) => {
  process.env.SUPABASE_URL = "https://example.invalid";
  const restoreSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = "test-key";
  context.after(() => {
    if (restoreSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = restoreSecret;
  });
  const readDeadline = new AbortController().signal;
  const timeout = context.mock.method(AbortSignal, "timeout", () => readDeadline);
  const request = context.mock.method(globalThis, "fetch", async () =>
    Response.json([{ receiptDate: "2026-11-18", total: "12500.50" }]),
  );

  const [receipt] = await getPrisma().receipt.findMany({
    where: { businessId: "11111111-1111-4111-8111-111111111111" },
    select: { receiptDate: true, total: true },
    orderBy: [{ receiptDate: "desc" }, { id: "desc" }],
    skip: 100,
    take: 100,
  });

  const sent = new URL(String(request.mock.calls[0]?.arguments[0]));
  assert.equal(sent.pathname, "/rest/v1/Receipt");
  assert.equal(sent.searchParams.get("businessId"), "eq.11111111-1111-4111-8111-111111111111");
  assert.equal(sent.searchParams.get("order"), "receiptDate.desc,id.desc");
  assert.equal(sent.searchParams.get("offset"), "100");
  assert.equal(sent.searchParams.get("limit"), "100");
  assert.equal(receipt?.receiptDate.toISOString(), "2026-11-18T00:00:00.000Z");
  assert.equal(receipt?.total.toNumber(), 12500.5);
  assert.equal(timeout.mock.calls[0]?.arguments[0], 10_000);
  assert.equal(request.mock.calls[0]?.arguments[1]?.signal, readDeadline);

  await getPrisma().receipt.update({
    where: { id: "11111111-1111-4111-8111-111111111111" },
    data: { total: 15000 },
    select: { id: true },
  });
  assert.equal(timeout.mock.callCount(), 1);
  assert.equal(request.mock.calls[1]?.arguments[1]?.signal, undefined);
});
