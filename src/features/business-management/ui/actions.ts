"use server";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { createBusinessStore } from "../repository/prisma-business";
import {
  createBusiness,
  getMembership,
  inviteMember,
  respondToInvitation,
  revokeInvitation,
  updateAlerts,
  updateBusiness,
} from "../services/business-access";
import {
  alertPreferencesSchema,
  businessProfileSchema,
  identifierSchema,
  invitationSchema,
  type ActionResult,
} from "../types/business";
import { fields, perform, selectBusiness } from "./action-runtime";

const businessIdSchema = z.object({ businessId: identifierSchema });

export async function createBusinessAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const outcome = await perform(async () => {
    const input = businessProfileSchema.parse(fields(formData));
    return createBusiness(actor, input, createBusinessStore());
  });
  if (!outcome.ok) return outcome.result;
  await selectBusiness(actor.id, outcome.value.id);
  revalidatePath("/", "layout");
  redirect("/beranda");
}

export async function switchBusinessAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const outcome = await perform(async () => {
    const { businessId } = businessIdSchema.parse(fields(formData));
    return getMembership(actor, businessId, createBusinessStore());
  });
  if (!outcome.ok) return outcome.result;
  await selectBusiness(actor.id, outcome.value.businessId);
  revalidatePath("/", "layout");
  redirect("/beranda");
}

export async function inviteMemberAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const outcome = await perform(async () => {
    const input = invitationSchema
      .extend({ businessId: identifierSchema })
      .parse(fields(formData));
    const tokenHash = createHash("sha256")
      .update(randomBytes(32))
      .digest("hex");
    await inviteMember(
      actor,
      input.businessId,
      input.email,
      new Date(),
      tokenHash,
      createBusinessStore(),
    );
  });
  if (!outcome.ok) return outcome.result;
  revalidatePath("/", "layout");
  return {
    status: "success",
    message:
      "Undangan dibuat. Penerima akan melihatnya di menu Onyxa setelah masuk.",
  };
}

export async function respondInvitationAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const outcome = await perform(async () => {
    const input = z
      .object({
        invitationId: identifierSchema,
        decision: z.enum(["accept", "dismiss"]),
      })
      .parse(fields(formData));
    return respondToInvitation(
      actor,
      input.invitationId,
      input.decision,
      new Date(),
      createBusinessStore(),
    );
  });
  if (!outcome.ok) return outcome.result;
  if (outcome.value) {
    await selectBusiness(actor.id, outcome.value);
    revalidatePath("/", "layout");
    redirect("/beranda");
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Undangan ditolak." };
}

export async function revokeInvitationAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const outcome = await perform(async () => {
    const input = businessIdSchema
      .extend({ invitationId: identifierSchema })
      .parse(fields(formData));
    await revokeInvitation(
      actor,
      input.businessId,
      input.invitationId,
      new Date(),
      createBusinessStore(),
    );
  });
  if (!outcome.ok) return outcome.result;
  revalidatePath("/", "layout");
  return { status: "success", message: "Undangan dibatalkan." };
}

export async function updateProfileAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const outcome = await perform(async () => {
    const input = businessProfileSchema
      .extend({ businessId: identifierSchema })
      .parse(fields(formData));
    await updateBusiness(
      actor,
      input.businessId,
      { name: input.name, businessType: input.businessType },
      createBusinessStore(),
    );
  });
  if (!outcome.ok) return outcome.result;
  revalidatePath("/", "layout");
  return { status: "success", message: "Profil usaha tersimpan." };
}

export async function updateAlertsAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const outcome = await perform(async () => {
    const data = fields(formData);
    const businessId = identifierSchema.parse(data.businessId);
    const input = alertPreferencesSchema.parse({
      priceIncreaseThresholdPercent: Number(data.priceIncreaseThresholdPercent),
      priceIncreaseAlertsEnabled: data.priceIncreaseAlertsEnabled === "on",
      slowMovingAlertsEnabled: data.slowMovingAlertsEnabled === "on",
    });
    await updateAlerts(actor, businessId, input, createBusinessStore());
  });
  if (!outcome.ok) return outcome.result;
  revalidatePath("/", "layout");
  return { status: "success", message: "Pengaturan peringatan tersimpan." };
}
