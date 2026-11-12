import "server-only";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

declare global {
  var onyxaPrisma: PrismaClient | undefined;
  var onyxaPrismaV3: PrismaClient | undefined;
}

const MODEL_TO_TABLE: Record<string, string> = {
  user: "User",
  business: "Business",
  businessMember: "BusinessMember",
  businessInvitation: "BusinessInvitation",
  supplier: "Supplier",
  item: "Item",
  itemAlias: "ItemAlias",
  receipt: "Receipt",
  receiptLine: "ReceiptLine",
};

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "lockedUntil",
  "removedAt",
  "expiresAt",
  "acceptedAt",
  "revokedAt",
  "archivedAt",
  "receiptDate",
  "confirmedAt",
]);

const DECIMAL_FIELDS = new Set([
  "priceIncreaseThresholdPercent",
  "total",
  "overallConfidence",
  "quantity",
  "unitPrice",
  "lineTotal",
  "confidence",
  "baseQuantity",
]);

type QueryObject = Record<string, unknown>;

function buildSelectParam(select?: QueryObject): string {
  if (!select) return "*";
  const parts: string[] = [];
  for (const [key, val] of Object.entries(select)) {
    if (!val) continue;
    if (val === true) {
      parts.push(key);
    } else if (typeof val === "object" && val !== null && "select" in val) {
      const nestedSelect = (val as { select: QueryObject }).select;
      const targetTable =
        key === "business"
          ? "Business"
          : key === "invitedBy"
            ? "BusinessMember"
            : key === "item"
              ? "Item"
              : key === "receipt"
                ? "Receipt"
                : key === "receiptLines"
                  ? "ReceiptLine"
                  : key;
      parts.push(`${key}:${targetTable}(${buildSelectParam(nestedSelect)})`);
    }
  }
  return parts.length > 0 ? parts.join(",") : "*";
}

function appendWhereFilters(params: URLSearchParams, where?: QueryObject) {
  if (!where) return;
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    // Compound unique keys like businessId_userId or businessId_nameKey
    if (
      typeof value === "object" &&
      value !== null &&
      !(value instanceof Date) &&
      !Array.isArray(value) &&
      key.includes("_")
    ) {
      for (const [subKey, subVal] of Object.entries(value as QueryObject)) {
        appendSingleFilter(params, subKey, subVal);
      }
      continue;
    }

    appendSingleFilter(params, key, value);
  }
}

function appendSingleFilter(
  params: URLSearchParams,
  key: string,
  value: unknown,
) {
  if (value === null) {
    params.append(key, "is.null");
    return;
  }
  if (value instanceof Date) {
    params.append(key, `eq.${value.toISOString()}`);
    return;
  }
  if (typeof value === "object") {
    const filterObj = value as QueryObject;
    if ("equals" in filterObj) {
      const op = filterObj.mode === "insensitive" ? "ilike" : "eq";
      params.append(key, `${op}.${String(filterObj.equals)}`);
      return;
    }
    if ("gt" in filterObj) {
      const gtVal =
        filterObj.gt instanceof Date
          ? filterObj.gt.toISOString()
          : String(filterObj.gt);
      params.append(key, `gt.${gtVal}`);
      return;
    }
    // Nested relation filter like receipt: { status: "SAVED" } is filtered in memory after join
    return;
  }
  params.append(key, `eq.${String(value)}`);
}

function hydrateRow(row: unknown): unknown {
  if (row === null || row === undefined) return row;
  if (Array.isArray(row)) return row.map(hydrateRow);
  if (typeof row !== "object") return row;

  const result: QueryObject = {};
  for (const [key, val] of Object.entries(row as QueryObject)) {
    if (val === null || val === undefined) {
      result[key] = val;
    } else if (DATE_FIELDS.has(key) && typeof val === "string") {
      result[key] = new Date(val);
    } else if (
      DECIMAL_FIELDS.has(key) &&
      (typeof val === "number" || typeof val === "string")
    ) {
      result[key] = new Prisma.Decimal(val);
    } else if (typeof val === "object") {
      result[key] = hydrateRow(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function serializePayload(
  table: string,
  data: QueryObject,
  isCreate: boolean,
): QueryObject {
  const nowIso = new Date().toISOString();
  const payload: QueryObject = {};

  if (isCreate && !("id" in data)) {
    payload.id = randomUUID();
  }
  if (isCreate && !("createdAt" in data) && table !== "ItemAlias") {
    payload.createdAt = nowIso;
  }
  if (table !== "ItemAlias" && !("updatedAt" in data)) {
    payload.updatedAt = nowIso;
  }

  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (v instanceof Date) {
      payload[k] = k === "receiptDate" ? v.toISOString().slice(0, 10) : v.toISOString();
    } else if (
      typeof v === "object" &&
      v !== null &&
      "increment" in (v as QueryObject)
    ) {
      // Handled specially in updateMany
      continue;
    } else {
      payload[k] = v;
    }
  }
  return payload;
}

function createSupabaseRestPrismaClient(
  supabaseUrl: string,
  secretKey: string,
): PrismaClient {
  const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

  async function requestSupabase(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };

    const res = await fetch(`${baseUrl}/${path}`, {
      ...init,
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      let parsed: { code?: string; message?: string } = {};
      try {
        parsed = JSON.parse(text) as { code?: string; message?: string };
      } catch {
        // ignore JSON parse error
      }
      if (parsed.code === "23505") {
        throw new Prisma.PrismaClientKnownRequestError(
          parsed.message ?? "Unique constraint failed",
          { code: "P2002", clientVersion: "7.10.1" },
        );
      }
      throw new Error(
        `Supabase REST error (${res.status}): ${parsed.message ?? text}`,
      );
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  function createModelDelegate(modelName: string) {
    const table = MODEL_TO_TABLE[modelName];

    async function findMany(args: QueryObject = {}): Promise<unknown[]> {
      const params = new URLSearchParams();
      params.set("select", buildSelectParam(args.select as QueryObject | undefined));
      appendWhereFilters(params, args.where as QueryObject | undefined);

      if (args.orderBy && typeof args.orderBy === "object") {
        const [field, dir] = Object.entries(args.orderBy as QueryObject)[0] ?? [];
        if (field && dir) {
          params.set("order", `${field}.${String(dir)}`);
        }
      }

      const rawRows = (await requestSupabase(
        `${table}?${params.toString()}`,
      )) as QueryObject[];

      // Filter nested receiptLines where receipt.status === "SAVED" if present
      const selectObj = args.select as QueryObject | undefined;
      if (
        selectObj &&
        typeof selectObj.receiptLines === "object" &&
        selectObj.receiptLines !== null
      ) {
        for (const r of rawRows) {
          if (Array.isArray(r.receiptLines)) {
            r.receiptLines = (r.receiptLines as QueryObject[]).filter((line) => {
              const receipt = line.receipt as QueryObject | undefined;
              return !receipt || !("status" in receipt) || receipt.status === "SAVED";
            });
          }
        }
      }

      return hydrateRow(rawRows) as unknown[];
    }

    async function findFirst(args: QueryObject = {}): Promise<unknown | null> {
      const rows = await findMany(args);
      return rows[0] ?? null;
    }

    async function findUnique(args: QueryObject = {}): Promise<unknown | null> {
      return findFirst(args);
    }

    async function create(args: QueryObject): Promise<unknown> {
      const rawData = { ...(args.data as QueryObject) };
      const nestedMembers = rawData.members as
        | { create?: QueryObject | QueryObject[] }
        | undefined;
      delete rawData.members;

      const select = args.select as QueryObject | undefined;
      const payload = serializePayload(table, rawData, true);

      const params = new URLSearchParams();
      params.set("select", buildSelectParam(select));

      const rows = (await requestSupabase(`${table}?${params.toString()}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      })) as QueryObject[];

      const createdRow = rows[0] ?? null;
      const createdId = (createdRow?.id ?? payload.id) as string;

      if (table === "Business" && nestedMembers?.create && createdId) {
        const memberItems = Array.isArray(nestedMembers.create)
          ? nestedMembers.create
          : [nestedMembers.create];
        for (const member of memberItems) {
          const memberPayload = serializePayload(
            "BusinessMember",
            { ...member, businessId: createdId },
            true,
          );
          await requestSupabase("BusinessMember", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify(memberPayload),
          });
        }
      }

      return hydrateRow(createdRow);
    }

    async function createMany(args: QueryObject): Promise<{ count: number }> {
      const items = (args.data as QueryObject[]).map((item) =>
        serializePayload(table, item, true),
      );
      if (items.length === 0) return { count: 0 };

      const rows = (await requestSupabase(table, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(items),
      })) as unknown[];

      return { count: Array.isArray(rows) ? rows.length : items.length };
    }

    async function update(args: QueryObject): Promise<unknown> {
      const where = args.where as QueryObject;
      const data = args.data as QueryObject;
      const select = args.select as QueryObject | undefined;
      const payload = serializePayload(table, data, false);

      const params = new URLSearchParams();
      params.set("select", buildSelectParam(select));
      appendWhereFilters(params, where);

      const rows = (await requestSupabase(`${table}?${params.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      })) as unknown[];

      return hydrateRow(rows[0] ?? null);
    }

    async function updateMany(args: QueryObject): Promise<{ count: number }> {
      const where = args.where as QueryObject;
      const data = { ...(args.data as QueryObject) };

      // Support atomic-like increment (e.g. loginVersion: { increment: 1 })
      for (const [k, v] of Object.entries(data)) {
        if (
          typeof v === "object" &&
          v !== null &&
          "increment" in (v as QueryObject)
        ) {
          const inc = Number((v as QueryObject).increment ?? 1);
          const baseVal =
            typeof where[k] === "number" ? (where[k] as number) : 0;
          data[k] = baseVal + inc;
        }
      }

      const payload = serializePayload(table, data, false);
      const params = new URLSearchParams();
      params.set("select", "id");
      appendWhereFilters(params, where);

      const rows = (await requestSupabase(`${table}?${params.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      })) as unknown[];

      return { count: Array.isArray(rows) ? rows.length : 0 };
    }

    async function upsert(args: QueryObject): Promise<unknown> {
      const existing = (await findFirst({
        where: args.where,
        select: { id: true, ...(args.select as QueryObject | undefined) },
      })) as QueryObject | null;

      if (existing) {
        const updateData = args.update as QueryObject;
        if (Object.keys(updateData).length === 0) {
          return existing;
        }
        return update({
          where: { id: existing.id },
          data: updateData,
          select: args.select,
        });
      }

      return create({
        data: args.create,
        select: args.select,
      });
    }

    return {
      findMany,
      findFirst,
      findUnique,
      create,
      createMany,
      update,
      updateMany,
      upsert,
    };
  }

  const client: Record<string, unknown> = {};
  for (const modelKey of Object.keys(MODEL_TO_TABLE)) {
    client[modelKey] = createModelDelegate(modelKey);
  }

  client.$transaction = async <T>(
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> => {
    return fn(client as unknown as PrismaClient);
  };

  return client as unknown as PrismaClient;
}

export function getPrisma(): PrismaClient {
  if (globalThis.onyxaPrismaV3) return globalThis.onyxaPrismaV3;

  const connectionString = process.env.SUPABASE_URL;
  if (!connectionString) {
    throw new Error("Set SUPABASE_URL before using the database.");
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (connectionString.startsWith("https://") && secretKey) {
    globalThis.onyxaPrismaV3 = createSupabaseRestPrismaClient(
      connectionString,
      secretKey,
    );
    return globalThis.onyxaPrismaV3;
  }

  globalThis.onyxaPrismaV3 = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  return globalThis.onyxaPrismaV3;
}
