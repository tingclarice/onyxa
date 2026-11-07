import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "./authjs";
import { getUser } from "../services/authentication";
import { createAccountRepository } from "../repository/prisma-accounts";
import type { AuthUser } from "../types/auth";

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await auth();
  const id = z.uuid().safeParse(session?.user?.id);
  return id.success ? getUser(id.data, createAccountRepository()) : null;
});
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");
  return user;
}
