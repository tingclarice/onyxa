import "server-only";
import { cookies } from "next/headers";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/session-cookies";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

// The cookie value is "<userId>:<businessId>" so a cookie left by another
// account on the same browser is ignored.

export async function saveActiveBusiness(userId: string, businessId: string) {
  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, `${userId}:${businessId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_IN_SECONDS,
  });
}

/** The business ID saved for this user, or undefined. Not trusted yet: the service checks membership. */
export async function readActiveBusinessId(
  userId: string,
): Promise<string | undefined> {
  const value = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;
  const [savedUserId, businessId] = value?.split(":") ?? [];
  return savedUserId === userId ? businessId : undefined;
}

