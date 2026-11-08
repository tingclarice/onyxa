import type { Actor, Membership, Workspace } from "../types/business";
import {
  checkIsActiveMember,
  chooseActiveMembership,
  normalizeEmail,
} from "../core/membership-rules";
import { keepOpenInvitations } from "../core/invitation-rules";
import {
  findMembership,
  listActiveMembershipsOfUser,
} from "../repository/membership-repository";
import { listUnansweredInvitationsForRecipient } from "../repository/invitation-repository";

/**
 * Everything the app shell needs about the logged-in user:
 * - the businesses they belong to,
 * - which one is active (from their saved choice, if still valid),
 * - their open invitations (the inbox).
 * Reading this never creates a business or membership.
 */
export async function getWorkspace(
  actor: Actor,
  selectedBusinessId: string | undefined,
  now: Date = new Date(),
): Promise<Workspace> {
  const memberships = await listActiveMembershipsOfUser(actor.id);

  const inbox = actor.email
    ? await listUnansweredInvitationsForRecipient(normalizeEmail(actor.email))
    : [];

  return {
    memberships,
    active: chooseActiveMembership(memberships, selectedBusinessId),
    invitations: keepOpenInvitations(inbox, now),
  };
}

/**
 * The user's membership in one business, e.g. before switching to it.
 * Throws "not_member" when they do not belong to that business.
 */
export async function getMembershipInBusiness(
  actor: Actor,
  businessId: string,
): Promise<Membership> {
  const membership = await findMembership(businessId, actor.id);
  return checkIsActiveMember(membership, actor, businessId);
}
