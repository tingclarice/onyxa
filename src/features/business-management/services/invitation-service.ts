import { runInTransaction } from "@/lib/database-transaction";
import type { Actor } from "../types/business";
import {
  checkIsOwner,
  getAccountEmail,
  normalizeEmail,
} from "../core/membership-rules";
import {
  buildNewInvitation,
  checkCanInviteEmail,
  checkInvitationIsForUser,
  checkInvitationIsOpen,
  checkInvitationWasUpdated,
  checkIsNotAlreadyMember,
  wasAlreadyAcceptedByUser,
} from "../core/invitation-rules";
import {
  findActiveMemberByEmail,
  findMembership,
  saveMembership,
} from "../repository/membership-repository";
import {
  createInvitation,
  findInvitationForRecipient,
  findInvitationOfBusiness,
  listUnansweredInvitationsOfBusiness,
  markInvitationAccepted,
  markInvitationRevoked,
} from "../repository/invitation-repository";

/**
 * Owner invites someone by email. The invitation appears in that person's
 * inbox (now, or after they sign up with that email).
 */
export async function inviteMember(
  actor: Actor,
  businessId: string,
  invitedEmail: string,
  now: Date = new Date(),
): Promise<void> {
  await runInTransaction(async (db) => {
    // 1. Only an owner may invite.
    const ownMembership = await findMembership(businessId, actor.id, db);
    const owner = checkIsOwner(ownMembership, actor, businessId);

    // 2. Not themselves, not an existing member, not invited twice.
    const existingMember = await findActiveMemberByEmail(
      businessId,
      normalizeEmail(invitedEmail),
      db,
    );
    const openInvitations = await listUnansweredInvitationsOfBusiness(
      businessId,
      db,
    );
    checkCanInviteEmail(actor, invitedEmail, existingMember, openInvitations, now);

    // 3. Save the invitation.
    const invitation = buildNewInvitation(businessId, owner, invitedEmail, now);
    await createInvitation(invitation, db);
  });
}

/**
 * Recipient presses "Yes": they join the business as STAFF.
 * Returns the business ID so the UI can switch to it.
 */
export async function acceptInvitation(
  actor: Actor,
  invitationId: string,
  now: Date = new Date(),
): Promise<string> {
  const email = getAccountEmail(actor);

  return runInTransaction(async (db) => {
    // 1. The invitation must be addressed to this user.
    const found = await findInvitationForRecipient(invitationId, email, db);
    const invitation = checkInvitationIsForUser(found, invitationId, actor);
    const membership = await findMembership(invitation.businessId, actor.id, db);

    // 2. Pressing "Yes" twice is fine: they are already in.
    if (wasAlreadyAcceptedByUser(invitation, membership, actor))
      return invitation.businessId;

    // 3. It must still be open, and they must not already be a member.
    checkInvitationIsOpen(invitation, now);
    checkIsNotAlreadyMember(membership);

    // 4. Close the invitation and add the membership (together, or neither).
    const updatedRows = await markInvitationAccepted(
      invitation.id,
      invitation.businessId,
      now,
      db,
    );
    checkInvitationWasUpdated(updatedRows);
    await saveMembership(
      invitation.businessId,
      actor.id,
      email,
      invitation.role,
      db,
    );

    return invitation.businessId;
  });
}

/** Recipient presses "No": the invitation is closed and nothing is joined. */
export async function declineInvitation(
  actor: Actor,
  invitationId: string,
  now: Date = new Date(),
): Promise<void> {
  const email = getAccountEmail(actor);

  await runInTransaction(async (db) => {
    const found = await findInvitationForRecipient(invitationId, email, db);
    const invitation = checkInvitationIsForUser(found, invitationId, actor);
    checkInvitationIsOpen(invitation, now);

    const updatedRows = await markInvitationRevoked(
      invitation.id,
      invitation.businessId,
      now,
      db,
    );
    checkInvitationWasUpdated(updatedRows);
  });
}

/** Owner cancels an invitation that has not been answered yet. */
export async function revokeInvitation(
  actor: Actor,
  businessId: string,
  invitationId: string,
  now: Date = new Date(),
): Promise<void> {
  await runInTransaction(async (db) => {
    const ownMembership = await findMembership(businessId, actor.id, db);
    checkIsOwner(ownMembership, actor, businessId);

    const invitation = await findInvitationOfBusiness(
      invitationId,
      businessId,
      db,
    );
    checkInvitationIsOpen(invitation, now);

    const updatedRows = await markInvitationRevoked(
      invitationId,
      businessId,
      now,
      db,
    );
    checkInvitationWasUpdated(updatedRows);
  });
}
