import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getPostgres, getPrisma } from "@/lib/prisma";
import { findTransactionForBusiness } from "@/features/invoice-processing/repository/receipt-transaction-repository";
import { Prisma } from "@/generated/prisma/client";

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

test("direct PostgreSQL replaces a cached client missing the settlement delegate after hot reload", async (context) => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  context.after(async () => {
    await globalThis.onyxaPostgres?.$disconnect();
    globalThis.onyxaPostgres = undefined;
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });
  // A server started before IncomeSettlement existed has this older API shape.
  const original = getPostgres();
  const stale = new Proxy(original, {
    has: (target, key) => key !== "incomeSettlement" && Reflect.has(target, key),
    get(target, key, receiver) {
      if (key === "incomeSettlement") return undefined;
      return Reflect.get(target, key, receiver);
    },
  });
  globalThis.onyxaPostgres = stale;
  const refreshed = getPostgres();
  assert.equal(typeof refreshed.incomeSettlement?.findMany, "function");
  assert.equal(typeof refreshed.incomeSettlement.createMany, "function");
  assert.equal(getPostgres(), refreshed);
});

test("transaction details hydrate both discounts and scope every request to the active business", async (context) => {
  process.env.SUPABASE_URL = "https://example.invalid";
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const params = url.searchParams;
    if (url.pathname.endsWith("/Receipt")) {
      assert.equal(params.get("id"), "eq.nota");
      if (params.get("businessId") === "eq.other") return Response.json([]);
      assert.equal(params.get("businessId"), "eq.active");
      return Response.json([{ supplierName: "Pasar", receiptDate: "2026-11-21",
        discount: "3000", total: "27000", imageUrl: null }]);
    }
    assert.equal(url.pathname, "/rest/v1/ReceiptLine");
    assert.equal(params.get("businessId"), "eq.active");
    assert.equal(params.get("receiptId"), "eq.nota");
    assert.equal(params.get("order"), "position.asc");
    return Response.json([
      { position: 1, rawName: "Susu", quantity: 2, unit: "pcs", unitPrice: 10000, discount: 2000, lineTotal: 18000 },
      { position: 2, rawName: "Roti", quantity: 1, unit: "pcs", unitPrice: 12000, discount: 0, lineTotal: 12000 },
    ]);
  });
  const oldSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = "test-key";
  context.after(() => {
    if (oldSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = oldSecret;
  });
  const receipt = await findTransactionForBusiness("active", "nota");
  assert.equal(receipt?.lines[0].discount, 2000);
  assert.equal(receipt?.subtotal, 30000);
  assert.equal(receipt?.discount, 3000);
  assert.equal(receipt?.total, 27000);
  assert.equal(await findTransactionForBusiness("other", "nota"), null);
});

test("a cached client can return raw discounts on both the receipt and its lines", async (context) => {
  process.env.SUPABASE_URL = "https://example.invalid";
  const oldSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = "test-key";
  context.after(() => {
    if (oldSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = oldSecret;
  });
  const db = getPrisma();
  const decimal = (value: number) => new Prisma.Decimal(value);
  context.mock.method(db.receipt, "findUnique", async () => ({
    supplierName: "Pasar", receiptDate: new Date("2026-11-21"), imageUrl: null,
    discount: "3000.50", total: decimal(14999.5),
  }));
  context.mock.method(db.receiptLine, "findMany", async () => [{
    position: 1, rawName: "Susu", unit: "pcs", quantity: decimal(2),
    unitPrice: decimal(10000), discount: 2000, lineTotal: decimal(18000),
  }]);
  const detail = await findTransactionForBusiness("active", "nota", db);
  assert.equal(detail?.discount, 3000.5);
  assert.equal(detail?.lines[0].discount, 2000);
  assert.equal(detail?.total, 14999.5);
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
