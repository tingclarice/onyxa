import { runInTransaction } from "@/lib/database-transaction";
import {
  alertPreferencesSchema,
  businessProfileSchema,
  businessProfileUpdateSchema,
  BusinessError,
  type Actor,
  type AlertPreferences,
  type Business,
  type BusinessProfileInput,
  type BusinessProfileUpdate,
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
import { isValidCloudinaryProfilePhoto } from "../repository/business-image-storage";

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
  const canManage = canManageBusiness(membership);
  const [members, invitations] = await Promise.all([
    listActiveMembersOfBusiness(businessId),
    canManage ? listUnansweredInvitationsOfBusiness(businessId) : [],
  ]);

  return {
    membership,
    members,
    invitations: keepOpenInvitations(invitations, now),
    canManage,
  };
}

/** Owner only: change the business name, type or image. */
export async function updateBusinessProfile(
  actor: Actor,
  businessId: string,
  input: BusinessProfileUpdate,
): Promise<void> {
  const profile = businessProfileUpdateSchema.parse(input);
  if (profile.profileImageUrl) {
    const membership = await getMembershipInBusiness(actor, businessId);
    checkIsOwner(membership, actor, businessId);
    if (!(await isValidCloudinaryProfilePhoto(profile.profileImageUrl))) {
      throw new BusinessError("invalid_profile_image");
    }
  }

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
