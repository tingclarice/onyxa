import type { LoginState } from "../types/auth";

export function isLocked(state: LoginState, now: Date): boolean {
  return (
    state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime()
  );
}
export function loginState(
  state: LoginState,
  valid: boolean,
  now: Date,
): LoginState {
  if (valid) return { failedLoginAttempts: 0, lockedUntil: null };
  const attempts = (state.lockedUntil ? 0 : state.failedLoginAttempts) + 1;
  return {
    failedLoginAttempts: Math.min(attempts, 5),
    lockedUntil:
      attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null,
  };
}
