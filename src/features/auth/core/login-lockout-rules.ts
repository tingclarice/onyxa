import type { LoginState } from "../types/auth";

/** After this many wrong passwords in a row, the account is locked. */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
/** How long a locked account stays locked. */
export const LOCK_DURATION_MINUTES = 15;

export function isAccountLocked(state: LoginState, now: Date): boolean {
  return (
    state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime()
  );
}

/**
 * Returns the new failed-attempt counter and lock time after one login try.
 * - Correct password: reset everything.
 * - Wrong password: count it; on the 5th failure, lock for 15 minutes.
 *   A lock that has already expired starts a fresh count.
 */
export function calculateLoginStateAfterAttempt(
  previous: LoginState,
  passwordIsCorrect: boolean,
  now: Date,
): LoginState {
  if (passwordIsCorrect) return { failedLoginAttempts: 0, lockedUntil: null };

  const previousFailures = previous.lockedUntil
    ? 0
    : previous.failedLoginAttempts;
  const failures = previousFailures + 1;
  const shouldLock = failures >= MAX_FAILED_LOGIN_ATTEMPTS;

  return {
    failedLoginAttempts: Math.min(failures, MAX_FAILED_LOGIN_ATTEMPTS),
    lockedUntil: shouldLock
      ? new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000)
      : null,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
