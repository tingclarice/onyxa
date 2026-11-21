import assert from "node:assert/strict";
import { mock, test } from "node:test";

mock.module("server-only", {});
mock.module("@google/genai", {
  namedExports: {
    GoogleGenAI: class {
      models = {
        async generateContent({ model }: { model: string }) {
          if (model === "gemini-3.5-flash") {
            throw Object.assign(new Error("private provider message"), { status: 503 });
          }
          throw new DOMException("remote deadline exceeded", "TimeoutError");
        },
      };
    },
  },
});

test("gallery scan correlates the download, failed model and fallback timeout", async (context) => {
  delete process.env.GEMINI_RECEIPT_MODEL;
  process.env.GEMINI_API_KEY = "private-test-key";
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  context.mock.method(globalThis, "fetch", async () =>
    new Response(Uint8Array.of(1, 2), { headers: { "content-type": "image/jpeg" } }),
  );
  const logs: Record<string, unknown>[] = [];
  function record(_prefix: string, fields: Record<string, unknown>) { logs.push(fields); }
  context.mock.method(console, "info", record);
  context.mock.method(console, "warn", record);
  const { scanReceipt } = await import("./receipt-scan-service");
  await assert.rejects(
    scanReceipt("https://res.cloudinary.com/test-cloud/image/upload/private-file.jpg", "test-ref"),
    /melewati batas waktu/,
  );
  assert.deepEqual(logs.map((log) => [log.stage, log.outcome, log.ref]), [
    ["cloudinary.download", "ok", "test-ref"],
    ["gemini.attempt", "started", "test-ref"], ["gemini.attempt", "failed", "test-ref"],
    ["gemini.attempt", "started", "test-ref"], ["gemini.attempt", "failed", "test-ref"],
  ]);
  const failures = logs.filter((log) => log.outcome === "failed");
  assert.deepEqual(failures.map((log) => [log.model, log.attempt, log.httpStatus, log.willRetry]), [
    ["gemini-3.5-flash", 1, 503, true], ["gemini-3.8-flash", 2, null, false],
  ]);
  for (const log of logs.filter((entry) => entry.outcome !== "started")) {
    assert.ok(typeof log.durationMs === "number" && log.durationMs >= 0);
  }
  assert.doesNotMatch(JSON.stringify(logs), /private-test-key|private-file|private provider message/);
});
