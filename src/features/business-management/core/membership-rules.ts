import {
  BusinessError,
  type Actor,
  type Membership,
  type MemberRole,
} from "../types/business";

/** Emails are compared lowercased and without spaces. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The logged-in user's normalized email. Throws when the account has none. */
export function getAccountEmail(actor: Actor): string {
  if (!actor.email) throw new BusinessError("missing_email");
  return normalizeEmail(actor.email);
}

/** True when the membership row is an active (not removed) member of `businessId` for this user. */
export function isActiveMemberOf(
  membership: Membership | null,
  actor: Actor,
  businessId: string,
): membership is Membership {
  return (
    membership !== null &&
    !membership.removedAt &&
    membership.userId === actor.id &&
    membership.businessId === businessId
  );
}

/** Throws "not_member" unless the user is an active member of the business. */
export function checkIsActiveMember(
  membership: Membership | null,
  actor: Actor,
  businessId: string,
): Membership {
  if (!isActiveMemberOf(membership, actor, businessId))
    throw new BusinessError("not_member");
  return membership;
}

/** Throws unless the user is an active OWNER of the business. */
export function checkIsOwner(
  membership: Membership | null,
  actor: Actor,
  businessId: string,
): Membership {
  const member = checkIsActiveMember(membership, actor, businessId);
  if (member.role !== "OWNER") throw new BusinessError("owner_required");
  return member;
}

export function canManageBusiness(membership: Membership): boolean {
  return membership.role === "OWNER" && !membership.removedAt;
}

/**
 * Picks which business the user is working in.
 * Uses the business saved in their cookie if they are still a member of it,
 * otherwise their first business, otherwise none.
 */
export function chooseActiveMembership(
  memberships: Membership[],
  selectedBusinessId: string | undefined,
): Membership | null {
  const active = memberships.filter((membership) => !membership.removedAt);
  const selected = active.find(
    (membership) => membership.businessId === selectedBusinessId,
  );
  return selected ?? active[0] ?? null;
}

/** The membership row for the person who creates a business: always OWNER. */
export function buildOwnerMembership(actor: Actor): {
  userId: string;
  email: string;
  role: MemberRole;
} {
  return { userId: actor.id, email: getAccountEmail(actor), role: "OWNER" };
}
