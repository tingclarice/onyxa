import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma } from "@/generated/prisma/client";

let failuresLeft = 0;
let failureCode = "P2034";
let attempts = 0;
let options: unknown;
mock.module("server-only", {});
mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
  namedExports: {
    getPrisma: () => ({
      async $transaction<T>(work: (db: object) => Promise<T>, given: unknown) {
        attempts++;
        options = given;
        if (failuresLeft-- > 0)
          throw new Prisma.PrismaClientKnownRequestError("private detail", {
            code: failureCode,
            clientVersion: "7.10.1",
          });
        return work({});
      },
    }),
  },
});
const transactions = import("./database-transaction");
beforeEach(() => {
  failuresLeft = 0;
  failureCode = "P2034";
  attempts = 0;
});

test("serializable conflicts are retried, up to three attempts", async () => {
  const { runInTransaction } = await transactions;
  failuresLeft = 2;
  assert.equal(await runInTransaction(async () => "done"), "done");
  assert.equal(attempts, 3);
  assert.deepEqual(options, { isolationLevel: "Serializable" });
});

test("other database errors are not retried", async () => {
  const { runInTransaction } = await transactions;
  failuresLeft = 1;
  failureCode = "P2002";
  await assert.rejects(runInTransaction(async () => true));
  assert.equal(attempts, 1);
});
