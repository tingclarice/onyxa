import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AuthUser } from "@/features/auth/types/auth";

class TestRedirect extends Error {
  constructor(readonly destination: string) { super(destination); }
}

let user: AuthUser | null = null;
let errorCode: string | null = null;
let hasSession = true;
let providerUnavailable = false;
let credentialsSent: unknown;
let metadataSent: unknown;
let confirmationSent: unknown;
let logoutOptions: unknown;
let cookieWritesEnabled = false;
let revalidations = 0;
let scanCalls = 0;
const originalNodeEnv = process.env.NODE_ENV;
const originalDevAuthBypass = process.env.DEV_AUTH_BYPASS;

function setNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, "NODE_ENV");
    return;
  }

  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}
const demoReceipt = {
  supplier_name: "Contoh pemasok",
  date: "2026-11-06",
  items: [
    {
      raw_name: "Contoh barang",
      qty: 1,
      unit: "pcs",
      unit_price: 1000,
      line_total: 1000,
      confidence: 0.9,
      matched_item: null,
    },
  ],
  total: 1000,
  overall_confidence: 0.9,
};

const fakeClient = {
  auth: {
    async getUser() {
      return { data: { user }, error: errorCode ? { code: errorCode } : null };
    },
    async signInWithPassword(input: unknown) {
      credentialsSent = input;
      if (providerUnavailable) throw new Error("private provider details");
      return { data: { session: hasSession ? {} : null }, error: errorCode ? { code: errorCode } : null };
    },
    async signUp(input: unknown) {
      metadataSent = input;
      return { data: { session: hasSession ? {} : null }, error: errorCode ? { code: errorCode } : null };
    },
    async verifyOtp(input: unknown) {
      confirmationSent = input;
      return { data: { session: hasSession ? {} : null }, error: errorCode ? { code: errorCode } : null };
    },
    async signOut(input: unknown) {
      logoutOptions = input;
      return { error: errorCode ? { code: errorCode } : null };
    },
  },
};

mock.module("server-only", {});
mock.module("next/navigation", { namedExports: {
  redirect(destination: string): never { throw new TestRedirect(destination); },
} });
mock.module("next/cache", { namedExports: { revalidatePath() { revalidations++; } } });
mock.module(pathToFileURL(resolve("src/lib/supabase/server.ts")).href, { namedExports: {
  async createSupabaseServerClient(writable = false) {
    cookieWritesEnabled = writable;
    return fakeClient;
  },
} });
mock.module(pathToFileURL(resolve("src/features/invoice-processing/services/mock-receipts.ts")).href, { namedExports: {
  async getMockReceipt() { scanCalls++; return demoReceipt; },
} });

const sessionModule = import("@/features/auth/services/session");
const actionsModule = import("@/features/auth/services/actions");

beforeEach(() => {
  setNodeEnv(originalNodeEnv);
  if (originalDevAuthBypass === undefined) {
    delete process.env.DEV_AUTH_BYPASS;
  } else {
    process.env.DEV_AUTH_BYPASS = originalDevAuthBypass;
  }
  user = null;
  errorCode = null;
  hasSession = true;
  providerUnavailable = false;
  credentialsSent = undefined;
  metadataSent = undefined;
  confirmationSent = undefined;
  logoutOptions = undefined;
  cookieWritesEnabled = false;
  revalidations = 0;
  scanCalls = 0;
});

test("missing and invalid sessions cannot access protected content", async () => {
  const { requireUser } = await sessionModule;
  await assert.rejects(requireUser(), (error: unknown) => error instanceof TestRedirect && error.destination === "/masuk");
  user = { id: "forged-user", email: "owner@example.com" };
  errorCode = "bad_jwt";
  await assert.rejects(requireUser(), TestRedirect);
});

test("verified users receive only the safe identity DTO", async () => {
  user = { id: "verified-user", email: "owner@example.com" };
  const { requireUser } = await sessionModule;
  assert.deepEqual(await requireUser(), user);
  assert.equal(cookieWritesEnabled, false);
});

test("login action enables cookie writes and invalidates authenticated UI", async () => {
  const { loginAction } = await actionsModule;
  const input = { email: "owner@example.com", password: "password-123" };
  assert.equal((await loginAction(input)).status, "authenticated");
  assert.deepEqual(credentialsSent, input);
  assert.equal(cookieWritesEnabled, true);
  assert.equal(revalidations, 1);
});

test("invalid action input does not reach the Supabase auth endpoint", async () => {
  const { loginAction } = await actionsModule;
  assert.equal((await loginAction({ email: "invalid" })).status, "error");
  assert.equal(credentialsSent, undefined);
  assert.equal(revalidations, 0);
});

test("provider exceptions become safe action errors without cache invalidation", async () => {
  providerUnavailable = true;
  const { loginAction } = await actionsModule;
  const result = await loginAction({ email: "owner@example.com", password: "password-123" });
  assert.equal(result.status, "error");
  assert(!result.message.includes("private provider details"));
  assert.equal(revalidations, 0);
});

test("signup maps names into user metadata and waits for email confirmation", async () => {
  hasSession = false;
  const { signupAction } = await actionsModule;
  const result = await signupAction({ email: "owner@example.com", password: "password-123", name: "Owner", businessName: "Warung" });
  assert.equal(result.status, "confirmation-required");
  assert.deepEqual(metadataSent, {
    email: "owner@example.com", password: "password-123",
    options: { data: { full_name: "Owner", business_name: "Warung" } },
  });
  assert.equal(revalidations, 0);
});

test("confirmation verifies only email tokens and redirects to a fixed local page", async () => {
  const { confirmEmailAction } = await actionsModule;
  const form = new FormData();
  form.set("token_hash", "token-hash");
  form.set("next", "https://untrusted.example");
  await assert.rejects(confirmEmailAction(null, form), (error: unknown) => error instanceof TestRedirect && error.destination === "/beranda");
  assert.deepEqual(confirmationSent, { token_hash: "token-hash", type: "email" });
  assert.equal(revalidations, 1);
});

test("an expired confirmation never redirects or invalidates the cache", async () => {
  errorCode = "otp_expired";
  const { confirmEmailAction } = await actionsModule;
  const form = new FormData();
  form.set("token_hash", "expired-token");
  assert.equal((await confirmEmailAction(null, form)).status, "error");
  assert.equal(revalidations, 0);
});

test("sign-out clears the current session and redirects only on success", async () => {
  const { signOutAction } = await actionsModule;
  errorCode = "network_error";
  assert.equal((await signOutAction()).status, "error");
  assert.equal(revalidations, 0);
  errorCode = null;
  await assert.rejects(signOutAction(), (error: unknown) => error instanceof TestRedirect && error.destination === "/masuk");
  assert.deepEqual(logoutOptions, { scope: "local" });
  assert.equal(revalidations, 1);
});

test("direct scan action calls require authentication even without a layout", async () => {
  setNodeEnv("test");
  delete process.env.DEV_AUTH_BYPASS;
  const { scanReceiptAction } = await import("@/features/invoice-processing/services/actions");
  await assert.rejects(scanReceiptAction(), TestRedirect);
  assert.equal(scanCalls, 0);
});

test("local development bypass supplies a fixed identity without Supabase", async () => {
  setNodeEnv("development");
  process.env.DEV_AUTH_BYPASS = "true";
  const { requireUser } = await sessionModule;

  assert.deepEqual(await requireUser(), {
    id: "local-development-auth-bypass",
    email: "local-dev@onyxa.invalid",
  });
  assert.equal(cookieWritesEnabled, false);
});

test("development bypass flag is ignored outside development", async () => {
  setNodeEnv("production");
  process.env.DEV_AUTH_BYPASS = "true";
  const { requireUser } = await sessionModule;

  await assert.rejects(requireUser(), TestRedirect);
});

test("scan action without an image continues returning the authenticated demo flow", async () => {
  setNodeEnv("test");
  delete process.env.DEV_AUTH_BYPASS;
  user = { id: "verified-user", email: "owner@example.com" };
  const { scanReceiptAction } = await import("@/features/invoice-processing/services/actions");

  assert.deepEqual(await scanReceiptAction(), {
    ok: true,
    result: { receipt: demoReceipt },
  });
  assert.equal(scanCalls, 1);
});
