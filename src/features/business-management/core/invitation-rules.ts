import {
  BusinessError,
  type Actor,
  type Invitation,
  type Membership,
  type NewInvitation,
} from "../types/business";
import { getAccountEmail, normalizeEmail } from "./membership-rules";

/** An invitation can be answered for this many days. */
export const INVITATION_VALID_DAYS = 7;

/**
 * Open = not accepted, not revoked, not expired, and the person who sent it
 * is still an owner of the business.
 */
export function isInvitationOpen(invitation: Invitation, now: Date): boolean {
  return (
    !invitation.acceptedAt &&
    !invitation.revokedAt &&
    invitation.inviterIsOwner &&
    Date.parse(invitation.expiresAt) > now.getTime()
  );
}

export function keepOpenInvitations(
  invitations: Invitation[],
  now: Date,
): Invitation[] {
  return invitations.filter((invitation) => isInvitationOpen(invitation, now));
}

/** Throws "invite_unavailable" unless the invitation exists and is still open. */
export function checkInvitationIsOpen(
  invitation: Invitation | null,
  now: Date,
): Invitation {
  if (!invitation || !isInvitationOpen(invitation, now))
    throw new BusinessError("invite_unavailable");
  return invitation;
}

/**
 * Throws "invite_unavailable" unless this exact invitation was sent to the
 * logged-in user's email.
 */
export function checkInvitationIsForUser(
  invitation: Invitation | null,
  invitationId: string,
  actor: Actor,
): Invitation {
  if (
    !invitation ||
    invitation.id !== invitationId ||
    invitation.emailKey !== getAccountEmail(actor)
  )
    throw new BusinessError("invite_unavailable");
  return invitation;
}

/**
 * True when the user already accepted this invitation and is a member now.
 * Pressing "Yes" twice (e.g. double click) should then just succeed.
 */
export function wasAlreadyAcceptedByUser(
  invitation: Invitation,
  membership: Membership | null,
  actor: Actor,
): boolean {
  return (
    invitation.acceptedAt !== null &&
    membership !== null &&
    !membership.removedAt &&
    membership.userId === actor.id &&
    membership.businessId === invitation.businessId
  );
}

/** Throws "already_member" when the user is already an active member. */
export function checkIsNotAlreadyMember(membership: Membership | null): void {
  if (membership && !membership.removedAt)
    throw new BusinessError("already_member");
}

/**
 * Throws when the owner may not invite this email:
 * their own email, an existing member, or someone with an open invitation.
 */
export function checkCanInviteEmail(
  actor: Actor,
  invitedEmail: string,
  existingMember: Membership | null,
  openInvitations: Invitation[],
  now: Date,
): void {
  const email = normalizeEmail(invitedEmail);
  if (email === getAccountEmail(actor))
    throw new BusinessError("cannot_invite_self");
  checkIsNotAlreadyMember(existingMember);
  const alreadyInvited = openInvitations.some(
    (invitation) =>
      invitation.emailKey === email && isInvitationOpen(invitation, now),
  );
  if (alreadyInvited) throw new BusinessError("already_invited");
}

/** The new invitation row: always STAFF, valid for 7 days. */
export function buildNewInvitation(
  businessId: string,
  inviter: Membership,
  invitedEmail: string,
  now: Date,
): NewInvitation {
  const email = normalizeEmail(invitedEmail);
  const validForMs = INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000;
  return {
    businessId,
    invitedByMemberId: inviter.id,
    email,
    emailKey: email,
    role: "STAFF",
    expiresAt: new Date(now.getTime() + validForMs),
  };
}

/**
 * Closing an invitation updates 0 rows when someone else (another tab, a
 * double click) closed it a moment earlier. Treat that as a conflict.
 */
export function checkInvitationWasUpdated(updatedRows: number): void {
  if (updatedRows !== 1) throw new BusinessError("conflict");
}
