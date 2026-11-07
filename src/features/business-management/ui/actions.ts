"use server";

// Server Functions for business forms. Each one follows the same steps:
//   1. get the logged-in user
//   2. validate the form
//   3. call ONE service function
//   4. turn errors into a safe message
//   5. refresh the page / save the cookie / redirect

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import {
  alertPreferencesSchema,
  businessProfileSchema,
  identifierSchema,
  invitationSchema,
  type ActionResult,
} from "../types/business";
import {
  createBusiness,
  updateAlertPreferences,
  updateBusinessProfile,
} from "../services/business-service";
import { getMembershipInBusiness } from "../services/workspace-service";
import {
  acceptInvitation,
  declineInvitation,
  inviteMember,
  revokeInvitation,
} from "../services/invitation-service";
import { toErrorResult } from "./error-messages";
import { saveActiveBusiness } from "./active-business-cookie";
import { readFormFields } from "./form-fields";

export async function createBusinessAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();

  let businessId: string;
  try {
    const input = businessProfileSchema.parse(readFormFields(formData));
    const business = await createBusiness(actor, input);
    businessId = business.id;
  } catch (error) {
    return toErrorResult(error);
  }

  await saveActiveBusiness(actor.id, businessId);
  revalidatePath("/", "layout");
  redirect("/beranda");
}

export async function switchBusinessAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();

  let businessId: string;
  try {
    const input = z
      .object({ businessId: identifierSchema })
      .parse(readFormFields(formData));
    const membership = await getMembershipInBusiness(actor, input.businessId);
    businessId = membership.businessId;
  } catch (error) {
    return toErrorResult(error);
  }

  await saveActiveBusiness(actor.id, businessId);
  revalidatePath("/", "layout");
  redirect("/beranda");
}

export async function inviteMemberAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();

  try {
    const input = invitationSchema
      .extend({ businessId: identifierSchema })
      .parse(readFormFields(formData));
    await inviteMember(actor, input.businessId, input.email);
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePath("/", "layout");
  return {
    status: "success",
    message: "Undangan dikirim ke inbox penerima. Berlaku selama 7 hari.",
  };
}

/** The Yes / No buttons in the inbox. */
export async function respondInvitationAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();

  let joinedBusinessId: string | null = null;
  try {
    const input = z
      .object({
        invitationId: identifierSchema,
        decision: z.enum(["accept", "dismiss"]),
      })
      .parse(readFormFields(formData));

    if (input.decision === "accept") {
      joinedBusinessId = await acceptInvitation(actor, input.invitationId);
    } else {
      await declineInvitation(actor, input.invitationId);
    }
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePath("/", "layout");
  if (joinedBusinessId) {
    await saveActiveBusiness(actor.id, joinedBusinessId);
    redirect("/beranda");
  }
  return { status: "success", message: "Undangan ditolak." };
}

export async function revokeInvitationAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();

  try {
    const input = z
      .object({ businessId: identifierSchema, invitationId: identifierSchema })
      .parse(readFormFields(formData));
    await revokeInvitation(actor, input.businessId, input.invitationId);
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Undangan dibatalkan." };
}

export async function updateProfileAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();

  try {
    const input = businessProfileSchema
      .extend({ businessId: identifierSchema })
      .parse(readFormFields(formData));
    await updateBusinessProfile(actor, input.businessId, {
      name: input.name,
      businessType: input.businessType,
    });
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Profil usaha tersimpan." };
}

export async function updateAlertsAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();

  try {
    const fields = readFormFields(formData);
    const businessId = identifierSchema.parse(fields.businessId);
    // Checkboxes send "on" when ticked and nothing when not.
    const input = alertPreferencesSchema.parse({
      priceIncreaseThresholdPercent: Number(fields.priceIncreaseThresholdPercent),
      priceIncreaseAlertsEnabled: fields.priceIncreaseAlertsEnabled === "on",
      slowMovingAlertsEnabled: fields.slowMovingAlertsEnabled === "on",
    });
    await updateAlertPreferences(actor, businessId, input);
  } catch (error) {
    return toErrorResult(error);
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Pengaturan peringatan tersimpan." };
}
