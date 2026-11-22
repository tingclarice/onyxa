import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";

mock.module("server-only", {});
const url = process.env.ONYXA_FINANCE_TEST_DATABASE_URL;
test("owners read monthly BI; members record scoped, retry-safe deposits and list history", { skip: !url }, async () => {
  process.env.DATABASE_URL = url;
  const { getPostgres } = await import("@/lib/prisma");
  const { getMonthlyDashboard, saveIncomeSettlement, getIncomeHistory } = await import("./finance-service");
  const db = getPostgres();
  try {
    const business = await db.business.create({ data: { name: "Kantin BI" } });
    const other = await db.business.create({ data: { name: "Kantin lain" } });
    async function addMember(role: "STAFF" | "OWNER") {
      const email = randomUUID() + "@example.invalid";
      const user = await db.user.create({ data: { email, name: role, passwordHash: "test" } });
      return db.businessMember.create({ data: { role, businessId: business.id, userId: user.id, email } });
    }
    const owner = await addMember("OWNER");
    const staff = await addMember("STAFF");
    const now = new Date("2026-11-22T05:00:00Z");
    const entry = { id: randomUUID(), date: "2026-11-20", cash: 9500, qris: 500 };
    await saveIncomeSettlement(business.id, staff.userId, entry, now);
    await saveIncomeSettlement(business.id, staff.userId, entry, now);
    await saveIncomeSettlement(business.id, owner.userId, { ...entry, id: randomUUID() }, now);
    await saveIncomeSettlement(business.id, staff.userId, { ...entry, date: "2026-11-21", id: randomUUID() }, now);
    await assert.rejects(saveIncomeSettlement(other.id, staff.userId, entry, now));
    await assert.rejects(saveIncomeSettlement(business.id, staff.userId, { ...entry, date: "2026-11-23" }, now));
    await assert.rejects(getMonthlyDashboard(business.id, staff.userId, now), /Owner/);
    await assert.rejects(getMonthlyDashboard(other.id, owner.userId, now));
    assert.equal((await getIncomeHistory(business.id, staff.userId, 1, now)).entries.length, 3);
    const item = await db.item.create({ data: { businessId: business.id, name: "Roti", nameKey: "roti", baseUnit: "PCS", category: "Makanan" } });
    const receipt = { businessId: business.id, createdByMemberId: staff.id, supplierName: "Pasar", receiptDate: new Date(entry.date), total: 2500 };
    await db.receipt.create({ data: { ...receipt, status: "NEEDS_REVIEW" } });
    const saved = await db.receipt.create({ data: { ...receipt, status: "SAVED" } });
    await db.receiptLine.create({ data: { businessId: business.id, receiptId: saved.id, itemId: item.id, position: 0, rawName: "ROTI", quantity: 2, unit: "pcs", unitPrice: 1500, lineTotal: 3000 } });
    const report = await getMonthlyDashboard(business.id, owner.userId, now);
    assert.deepEqual([report.average, report.depositDays, report.balance], [15000, 2, 27500]);
    assert.deepEqual(report.categories, [{ name: "Makanan", value: 2500 }]);
  } finally { await db.$disconnect(); }
});
