import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/session-cookies";
import { createBusinessStore } from "../repository/prisma-business";
import { getBusinessSettings, getWorkspace } from "../services/business-access";
import { identifierSchema } from "../types/business";

export const getBusinessWorkspace = cache(async () => {
  const actor = await requireUser();
  const selection = (await cookies())
    .get(ACTIVE_BUSINESS_COOKIE)
    ?.value.split(":");
  const parsed = identifierSchema.safeParse(
    selection?.[0] === actor.id ? selection[1] : undefined,
  );
  const workspace = await getWorkspace(
    actor,
    parsed.success ? parsed.data : undefined,
    new Date(),
    createBusinessStore(),
  );
  return { actor, ...workspace };
});

export async function requireActiveBusiness() {
  const workspace = await getBusinessWorkspace();
  if (!workspace.active) redirect("/beranda");
  return { actor: workspace.actor, membership: workspace.active };
}

export async function getSettings() {
  const { actor, membership } = await requireActiveBusiness();
  return getBusinessSettings(
    actor,
    membership.businessId,
    new Date(),
    createBusinessStore(),
  );
}
