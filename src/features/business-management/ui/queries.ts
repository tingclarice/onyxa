import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { identifierSchema } from "../types/business";
import { getWorkspace } from "../services/workspace-service";
import { getBusinessSettings } from "../services/business-service";
import { readActiveBusinessId } from "./active-business-cookie";

const DEV_BYPASS_MEMBERSHIP = {
  id: "00000000-0000-0000-0000-000000000002",
  businessId: "00000000-0000-0000-0000-000000000003",
  userId: "00000000-0000-0000-0000-000000000001",
  email: "dev@onyxa.local",
  role: "OWNER" as const,
  removedAt: null,
  business: {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Dev Business",
    businessType: "CAFE_RESTAURANT" as const,
    priceIncreaseThresholdPercent: 10,
    priceIncreaseAlertsEnabled: true,
    slowMovingAlertsEnabled: true,
    slowMovingGracePercent: 20,
  },
};

/** The logged-in user + their businesses, active business and inbox. */
export const getBusinessWorkspace = cache(async () => {
  const actor = await requireUser();

  if (process.env.DEV_AUTH_BYPASS === "true") {
    return {
      actor,
      memberships: [DEV_BYPASS_MEMBERSHIP],
      active: DEV_BYPASS_MEMBERSHIP,
      invitations: [],
      inbox: [],
    };
  }

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

/** Settings of the active business: team, open invitations, and whether the user may manage it. */
export async function getActiveBusinessSettings() {
  const { actor, membership } = await requireActiveBusiness();
  return getBusinessSettings(actor, membership.businessId);
}
