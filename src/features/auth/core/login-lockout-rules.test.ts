import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateLoginStateAfterAttempt,
  isAccountLocked,
} from "./login-lockout-rules";

const now = new Date("2026-11-07T00:00:00Z");

test("a correct password resets the counter and lock", () => {
  assert.deepEqual(
    calculateLoginStateAfterAttempt(
      { failedLoginAttempts: 4, lockedUntil: null },
      true,
      now,
    ),
    { failedLoginAttempts: 0, lockedUntil: null },
  );
});

test("the fifth wrong password locks the account for fifteen minutes", () => {
  const state = calculateLoginStateAfterAttempt(
    { failedLoginAttempts: 4, lockedUntil: null },
    false,
    now,
  );
  assert.equal(state.failedLoginAttempts, 5);
  assert.equal(state.lockedUntil?.toISOString(), "2026-11-07T00:15:00.000Z");
  assert.equal(isAccountLocked(state, now), true);
  assert.equal(isAccountLocked(state, new Date("2026-11-07T00:15:00Z")), false);
});

test("a wrong password after an expired lock starts counting from one again", () => {
  const state = calculateLoginStateAfterAttempt(
    { failedLoginAttempts: 5, lockedUntil: new Date("2026-11-06T00:00:00Z") },
    false,
    now,
  );
  assert.deepEqual(state, { failedLoginAttempts: 1, lockedUntil: null });
});
