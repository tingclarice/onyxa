import { runInTransaction } from "@/lib/database-transaction";
import {
  alertPreferencesSchema,
  businessProfileSchema,
  type Actor,
  type AlertPreferences,
  type Business,
  type BusinessProfileInput,
  type BusinessSettings,
} from "../types/business";
import {
  buildOwnerMembership,
  canManageBusiness,
  checkIsOwner,
} from "../core/membership-rules";
import { keepOpenInvitations } from "../core/invitation-rules";
import {
  createBusinessWithOwner,
  saveAlertPreferences,
  saveBusinessProfile,
} from "../repository/business-repository";
import {
  findMembership,
  listActiveMembersOfBusiness,
} from "../repository/membership-repository";
import { listUnansweredInvitationsOfBusiness } from "../repository/invitation-repository";
import { getMembershipInBusiness } from "./workspace-service";

/** Creates a new business. The creator becomes its OWNER. */
export async function createBusiness(
  actor: Actor,
  input: BusinessProfileInput,
): Promise<Business> {
  const profile = businessProfileSchema.parse(input);
  const owner = buildOwnerMembership(actor);

  // One nested write: the business and the owner row are saved together or not at all.
  return createBusinessWithOwner(profile, owner);
}

/**
 * Data for the settings page: the business, its team and, for owners only,
 * the invitations that are still open.
 */
export async function getBusinessSettings(
  actor: Actor,
  businessId: string,
  now: Date = new Date(),
): Promise<BusinessSettings> {
  const membership = await getMembershipInBusiness(actor, businessId);
  const members = await listActiveMembersOfBusiness(businessId);

  const canManage = canManageBusiness(membership);

  let invitations = canManage
    ? await listUnansweredInvitationsOfBusiness(businessId)
    : [];
  invitations = keepOpenInvitations(invitations, now);

  return { membership, members, invitations, canManage };
}

/** Owner only: change the business name and type. */
export async function updateBusinessProfile(
  actor: Actor,
  businessId: string,
  input: BusinessProfileInput,
): Promise<void> {
  const profile = businessProfileSchema.parse(input);

  await runInTransaction(async (db) => {
    const membership = await findMembership(businessId, actor.id, db);
    checkIsOwner(membership, actor, businessId);

    await saveBusinessProfile(businessId, profile, db);
  });
}

/** Owner only: change price-increase and slow-moving alert settings. */
export async function updateAlertPreferences(
  actor: Actor,
  businessId: string,
  input: AlertPreferences,
): Promise<void> {
  const preferences = alertPreferencesSchema.parse(input);

  await runInTransaction(async (db) => {
    const membership = await findMembership(businessId, actor.id, db);
    checkIsOwner(membership, actor, businessId);

    await saveAlertPreferences(businessId, preferences, db);
  });
}
