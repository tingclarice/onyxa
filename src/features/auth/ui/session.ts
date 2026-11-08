import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "./authjs";
import { getUserById } from "../services/account-service";
import type { AuthUser } from "../types/auth";

/** The logged-in user, read fresh from the database. Null when logged out. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await auth();
  const userId = z.uuid().safeParse(session?.user?.id);
  if (!userId.success) return null;
  return getUserById(userId.data);
});
/** Use in every protected Server Function. Redirects to login when logged out. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");
  return user;
}
