import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { identifierSchema } from "../types/business";
import { getWorkspace } from "../services/workspace-service";
import { getBusinessSettings } from "../services/business-service";
import { readActiveBusinessId } from "./active-business-cookie";

/** The logged-in user + their businesses, active business and inbox. */
export const getBusinessWorkspace = cache(async () => {
  const actor = await requireUser();

  const savedBusinessId = identifierSchema.safeParse(
    await readActiveBusinessId(actor.id),
  );
  const workspace = await getWorkspace(
    actor,
    savedBusinessId.success ? savedBusinessId.data : undefined,
  );

  return { actor, ...workspace };
});

/** For pages that need a business. Redirects to /beranda when there is none. */
export async function requireActiveBusiness() {
  const workspace = await getBusinessWorkspace();
  if (!workspace.active) redirect("/beranda");
  return { actor: workspace.actor, membership: workspace.active };
}

export async function getSettings() {
  const { actor, membership } = await requireActiveBusiness();
  return getBusinessSettings(actor, membership.businessId);
}
