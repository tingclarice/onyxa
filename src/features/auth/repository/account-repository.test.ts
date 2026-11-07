import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Prisma } from "@/generated/prisma/client";
import { AccountExistsError } from "../types/auth";

const calls: { operation: string; input: unknown }[] = [];
let conflict = false;
mock.module("server-only", {});
mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
  namedExports: {
    getPrisma: () => ({
      user: {
        async findUnique(input: unknown) {
          calls.push({ operation: "findUnique", input });
          return null;
        },
        async create(input: unknown) {
          calls.push({ operation: "create", input });
          if (conflict)
            throw new Prisma.PrismaClientKnownRequestError("private conflict", {
              code: "P2002",
              clientVersion: "7.10.1",
            });
          return { id: "user", email: "user@example.com", name: "User" };
        },
        async updateMany(input: unknown) {
          calls.push({ operation: "updateMany", input });
          return { count: conflict ? 0 : 1 };
        },
      },
    }),
  },
});
const repository = import("./account-repository");
beforeEach(() => {
  calls.length = 0;
  conflict = false;
});

test("identity queries select only public fields while credential lookup stays email scoped", async () => {
  const { findUserById, findAccountByEmail } = await repository;
  await findUserById("trusted-user");
  assert.deepEqual(calls[0].input, {
    where: { id: "trusted-user" },
    select: { id: true, email: true, name: true },
  });
  await findAccountByEmail("user@example.com");
  const credentials = calls[1].input;
  assert(
    typeof credentials === "object" &&
      credentials !== null &&
      "where" in credentials,
  );
  assert.deepEqual(credentials.where, { email: "user@example.com" });
});

test("login updates compare versions and report stale writes without overwriting newer state", async () => {
  const { saveLoginAttempt } = await repository;
  const state = { failedLoginAttempts: 1, lockedUntil: null };
  assert.equal(await saveLoginAttempt("user", 4, state), true);
  assert.deepEqual(calls[0].input, {
    where: { id: "user", loginVersion: 4 },
    data: { ...state, loginVersion: { increment: 1 } },
  });
  conflict = true;
  assert.equal(await saveLoginAttempt("user", 4, state), false);
});

test("unique account conflicts have a typed safe error", async () => {
  conflict = true;
  const { createAccount } = await repository;
  await assert.rejects(
    createAccount({
      email: "user@example.com",
      name: "User",
      passwordHash: "hash",
    }),
    AccountExistsError,
  );
});
