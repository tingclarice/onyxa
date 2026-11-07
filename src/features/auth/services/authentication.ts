import {
  createAuthSchema,
  type AccountRepository,
  type AuthUser,
  type PasswordHasher,
} from "../types/auth";
import { isLocked, loginState } from "../core/login-policy";

export async function signup(
  input: unknown,
  accounts: AccountRepository,
  passwords: PasswordHasher,
): Promise<AuthUser> {
  const parsed = createAuthSchema("signup").parse(input);
  if (!parsed.name) throw new Error("missing_name");
  return accounts.createAccount({
    email: parsed.email.toLowerCase(),
    name: parsed.name,
    passwordHash: await passwords.hash(parsed.password),
  });
}
export async function authenticate(
  input: unknown,
  now: Date,
  accounts: AccountRepository,
  passwords: PasswordHasher,
): Promise<AuthUser | null> {
  const parsed = createAuthSchema("login").safeParse(input);
  if (!parsed.success) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const account = await accounts.findCredentials(
      parsed.data.email.toLowerCase(),
    );
    if (!account || isLocked(account, now)) {
      await passwords.dummyVerify(parsed.data.password);
      return null;
    }
    const valid = await passwords.verify(
      parsed.data.password,
      account.passwordHash,
    );
    const recorded = await accounts.recordLogin(
      account.id,
      account.loginVersion,
      loginState(account, valid, now),
    );
    // A concurrent attempt must not overwrite a newer lockout or successful login.
    if (!recorded) continue;
    return valid
      ? { id: account.id, email: account.email, name: account.name }
      : null;
  }
  return null;
}
export async function getUser(
  id: string,
  accounts: AccountRepository,
): Promise<AuthUser | null> {
  return accounts.findUser(id);
}
