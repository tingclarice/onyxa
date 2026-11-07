import { createAuthSchema, type AuthUser } from "../types/auth";
import {
  calculateLoginStateAfterAttempt,
  isAccountLocked,
  normalizeEmail,
} from "../core/login-lockout-rules";
import {
  createAccount,
  findAccountByEmail,
  findUserById,
  saveLoginAttempt,
} from "../repository/account-repository";
import {
  hashPassword,
  runFakePasswordCheck,
  verifyPassword,
} from "../repository/password-hashing";

/**
 * Sign up: create an account only. No business or membership is created here.
 * Throws a ZodError for invalid input and AccountExistsError for a taken email.
 */
export async function registerAccount(input: unknown): Promise<AuthUser> {
  const form = createAuthSchema("signup").parse(input);
  if (!form.name) throw new Error("missing_name");

  const passwordHash = await hashPassword(form.password);

  return createAccount({
    email: normalizeEmail(form.email),
    name: form.name,
    passwordHash,
  });
}

/**
 * Log in with email + password.
 * Returns the user when the password is correct, otherwise null.
 * Unknown email, wrong password and locked account all return the same null.
 */
export async function loginWithPassword(
  input: unknown,
  now: Date = new Date(),
): Promise<AuthUser | null> {
  const form = createAuthSchema("login").safeParse(input);
  if (!form.success) return null;
  const email = normalizeEmail(form.data.email);
  const password = form.data.password;

  // Two login attempts can race. If ours loses, read the account again and
  // retry, so we never overwrite a newer lock or a newer successful login.
  const MAX_TRIES = 3;
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const account = await findAccountByEmail(email);
    if (!account || isAccountLocked(account, now)) {
      await runFakePasswordCheck(password);
      return null;
    }

    const passwordIsCorrect = await verifyPassword(
      password,
      account.passwordHash,
    );
    const newLoginState = calculateLoginStateAfterAttempt(
      account,
      passwordIsCorrect,
      now,
    );

    const saved = await saveLoginAttempt(
      account.id,
      account.loginVersion,
      newLoginState,
    );
    if (!saved) continue;

    if (!passwordIsCorrect) return null;
    return { id: account.id, email: account.email, name: account.name };
  }
  return null;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  return findUserById(id);
}
