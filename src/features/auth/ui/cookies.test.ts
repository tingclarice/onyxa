import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import { NextRequest } from "next/server";

interface ClientOptions {
  cookies: CookieMethodsServer;
  cookieOptions: CookieOptions;
}

let capturedOptions: ClientOptions | undefined;
let claimsCalls = 0;
let refreshCookies = false;
let writtenCookies: { name: string; value: string; options: CookieOptions }[] = [];

mock.module("server-only", {});
mock.module("next/headers", { namedExports: {
  async cookies() {
    return {
      getAll: () => [{ name: "sb-test-auth-token", value: "old-token" }],
      set(name: string, value: string, options: CookieOptions) { writtenCookies.push({ name, value, options }); },
    };
  },
} });
mock.module("@supabase/ssr", { namedExports: {
  createServerClient(url: string, key: string, options: ClientOptions) {
    assert.equal(url, "https://project.example.com");
    assert.equal(key, "test-publishable-key");
    capturedOptions = options;
    return { auth: {
      async getClaims() {
        claimsCalls++;
        if (refreshCookies) {
          await options.cookies.setAll?.([
            { name: "sb-test-auth-token", value: "refreshed-token", options: { httpOnly: true, path: "/" } },
          ], { "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache" });
          await options.cookies.setAll?.([
            { name: "sb-extra", value: "second-cookie", options: { httpOnly: true, path: "/" } },
          ], {});
        }
        return { data: { claims: { sub: "verified-user" } }, error: null };
      },
    } };
  },
} });

beforeEach(() => {
  process.env.SUPABASE_URL = "https://project.example.com";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  capturedOptions = undefined;
  claimsCalls = 0;
  refreshCookies = false;
  writtenCookies = [];
});

test("Server Components read cookies but do not try to write them", async () => {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  await createSupabaseServerClient();
  assert(capturedOptions);
  assert.deepEqual(await capturedOptions.cookies.getAll(), [{ name: "sb-test-auth-token", value: "old-token" }]);
  await capturedOptions.cookies.setAll?.([{ name: "session", value: "new-token", options: {} }], {});
  assert.equal(writtenCookies.length, 0);
  assert.equal(capturedOptions.cookieOptions.httpOnly, true);
  assert.equal(capturedOptions.cookieOptions.sameSite, "lax");
});

test("Server Functions write and clear auth cookies", async () => {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  await createSupabaseServerClient(true);
  assert(capturedOptions);
  await capturedOptions.cookies.setAll?.([
    { name: "session", value: "new-token", options: { httpOnly: true } },
    { name: "old-session", value: "", options: { maxAge: 0 } },
  ], {});
  assert.equal(writtenCookies.length, 2);
  assert.equal(writtenCookies[0].value, "new-token");
  assert.equal(writtenCookies[1].options.maxAge, 0);
});

test("public visitors need no Supabase call or build-time configuration", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  const { updateSession } = await import("@/lib/supabase/proxy");
  const response = await updateSession(new NextRequest("https://onyxa.example/"));
  assert.equal(response.status, 200);
  assert.equal(claimsCalls, 0);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("refresh forwards all cookie writes to both the request and response", async () => {
  refreshCookies = true;
  const { updateSession } = await import("@/lib/supabase/proxy");
  const request = new NextRequest("https://onyxa.example/beranda", { headers: { cookie: "sb-test-auth-token=old-token" } });
  const response = await updateSession(request);
  assert.equal(claimsCalls, 1);
  assert.equal(request.cookies.get("sb-test-auth-token")?.value, "refreshed-token");
  assert.equal(request.cookies.get("sb-extra")?.value, "second-cookie");
  assert.equal(response.cookies.get("sb-test-auth-token")?.value, "refreshed-token");
  assert.equal(response.cookies.get("sb-extra")?.value, "second-cookie");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Expires"), "0");
  assert.equal(response.headers.get("Pragma"), "no-cache");
  assert(response.headers.get("x-middleware-request-cookie")?.includes("refreshed-token"));
});

test("invalid configuration fails without exposing configured values", async () => {
  process.env.SUPABASE_URL = "invalid-secret-value";
  const { getSupabaseConfig } = await import("@/lib/supabase/config");
  assert.throws(getSupabaseConfig, (error: unknown) => error instanceof Error && !error.message.includes("invalid-secret-value"));
});
