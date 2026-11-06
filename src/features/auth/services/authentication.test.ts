import assert from "node:assert/strict";
import test from "node:test";
import type { AuthGateway } from "@/features/auth/types/auth";
import { login, signup, confirmEmail, signout } from "@/features/auth/services/authentication";

const credentials = { email: "owner@example.com", password: "password-123" };
const registration = { ...credentials, name: "Owner", businessName: "Warung" };

function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    signIn: async () => ({ errorCode: null, hasSession: true }),
    signUp: async () => ({ errorCode: null, hasSession: false }),
    confirmEmail: async () => ({ errorCode: null, hasSession: true }),
    signOut: async () => ({ errorCode: null }),
    ...overrides,
  };
}

test("invalid login input never reaches the provider", async () => {
  let calls = 0;
  const provider = gateway({ signIn: async () => { calls++; throw new Error("must not be called"); } });
  for (const input of [null, {}, { email: "invalid", password: "secret" }, { ...credentials, password: "" }]) {
    assert.equal((await login(input, provider)).status, "error");
  }
  assert.equal(calls, 0);
});

test("login normalizes email and preserves password whitespace", async () => {
  const result = await login({ email: " owner@example.com ", password: " secret " }, gateway({
    signIn: async (input) => {
      assert.deepEqual(input, { email: "owner@example.com", password: " secret " });
      return { errorCode: null, hasSession: true };
    },
  }));
  assert.equal(result.status, "authenticated");
});

test("invalid credentials and unconfirmed emails stay unauthenticated", async () => {
  for (const errorCode of ["invalid_credentials", "email_not_confirmed"]) {
    const result = await login(credentials, gateway({ signIn: async () => ({ errorCode, hasSession: false }) }));
    assert.equal(result.status, "error");
  }
});

test("a provider success without a session never authenticates login", async () => {
  assert.equal((await login(credentials, gateway({
    signIn: async () => ({ errorCode: null, hasSession: false }),
  }))).status, "error");
});

test("signup validates required metadata and password before calling Supabase", async () => {
  let calls = 0;
  const provider = gateway({ signUp: async () => { calls++; throw new Error("must not be called"); } });
  for (const input of [credentials, { ...registration, name: " " }, { ...registration, businessName: " " }, { ...registration, password: "short" }]) {
    assert.equal((await signup(input, provider)).status, "error");
  }
  assert.equal(calls, 0);
});

test("signup passes normalized profile data to the provider", async () => {
  const result = await signup({ ...registration, name: " Owner ", businessName: " Warung " }, gateway({
    signUp: async (input) => {
      assert.deepEqual(input, registration);
      return { errorCode: null, hasSession: false };
    },
  }));
  assert.equal(result.status, "confirmation-required");
});

test("signup signs in immediately only when the provider supplies a session", async () => {
  assert.equal((await signup(registration, gateway({
    signUp: async () => ({ errorCode: null, hasSession: true }),
  }))).status, "authenticated");
});

test("confirmation rejects missing or oversized tokens before provider calls", async () => {
  let calls = 0;
  const provider = gateway({ confirmEmail: async () => { calls++; throw new Error("must not be called"); } });
  for (const token of [null, "", "a".repeat(2049)]) {
    assert.equal((await confirmEmail(token, provider)).status, "error");
  }
  assert.equal(calls, 0);
});

test("confirmation requires a valid provider session", async () => {
  assert.equal((await confirmEmail("token-hash", gateway())).status, "authenticated");
  for (const attempt of [{ errorCode: "otp_expired", hasSession: false }, { errorCode: null, hasSession: false }]) {
    assert.equal((await confirmEmail("token-hash", gateway({ confirmEmail: async () => attempt }))).status, "error");
  }
});

test("provider internals are never included in error messages", async () => {
  const result = await login(credentials, gateway({
    signIn: async () => ({ errorCode: "internal-provider-secret", hasSession: false }),
  }));
  assert.equal(result.status, "error");
  assert(!result.message.includes("internal-provider-secret"));
});

test("rate limiting produces a retry message", async () => {
  const result = await signup(registration, gateway({
    signUp: async () => ({ errorCode: "over_email_send_rate_limit", hasSession: false }),
  }));
  assert.equal(result.status, "error");
  assert.match(result.message, /Tunggu/);
});

test("sign-out errors are not reported as success", async () => {
  assert.equal((await signout(gateway())).status, "signed-out");
  assert.equal((await signout(gateway({ signOut: async () => ({ errorCode: "network_error" }) }))).status, "error");
});
