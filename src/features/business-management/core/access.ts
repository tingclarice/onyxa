import {
  BusinessError,
  businessProfileSchema,
  type Actor,
  type Membership,
  type Invitation,
  type BusinessProfileInput,
  type NewInvitation,
} from "../types/business";

export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

export function verifiedEmail(actor: Actor): string {
  if (!actor.email || !actor.emailVerified)
    throw new BusinessError("verify_email");
  return emailKey(actor.email);
}

export function requireMembership(
  member: Membership | null,
  actor: Actor,
  businessId: string,
): Membership {
  if (
    !member ||
    member.removedAt ||
    member.userId !== actor.id ||
    member.businessId !== businessId
  )
    throw new BusinessError("not_member");
  return member;
}

export function requireOwner(
  member: Membership | null,
  actor: Actor,
  businessId: string,
): Membership {
  const active = requireMembership(member, actor, businessId);
  if (active.role !== "OWNER") throw new BusinessError("owner_required");
  return active;
}

export function selectMembership(
  memberships: Membership[],
  selectedId: string | undefined,
): Membership | null {
  const active = memberships.filter((member) => !member.removedAt);
  return (
    active.find((member) => member.businessId === selectedId) ??
    active[0] ??
    null
  );
}

export function isPending(invitation: Invitation, now: Date): boolean {
  return (
    !invitation.acceptedAt &&
    !invitation.revokedAt &&
    invitation.inviterIsOwner &&
    Date.parse(invitation.expiresAt) > now.getTime()
  );
}

export function createBusinessPlan(actor: Actor, input: BusinessProfileInput) {
  return {
    profile: businessProfileSchema.parse(input),
    owner: {
      userId: actor.id,
      email: verifiedEmail(actor),
      role: "OWNER" as const,
    },
  };
}

export function canManageBusiness(member: Membership): boolean {
  return member.role === "OWNER" && !member.removedAt;
}

export function requirePendingInvitation(
  invitation: Invitation | null,
  now: Date,
): void {
  if (!invitation || !isPending(invitation, now))
    throw new BusinessError("invite_unavailable");
}

export function createInvitationPlan(
  actor: Actor,
  member: Membership | null,
  businessId: string,
  email: string,
  existingMember: Membership | null,
  invitations: Invitation[],
  now: Date,
  tokenHash: string,
): NewInvitation {
  const owner = requireOwner(member, actor, businessId);
  const target = emailKey(email);
  if (target === verifiedEmail(actor))
    throw new BusinessError("cannot_invite_self");
  if (existingMember && !existingMember.removedAt)
    throw new BusinessError("already_member");
  if (
    invitations.some(
      (invitation) =>
        invitation.emailKey === target && isPending(invitation, now),
    )
  )
    throw new BusinessError("already_invited");
  return {
    businessId,
    invitedByMemberId: owner.id,
    email: target,
    emailKey: target,
    role: "STAFF",
    tokenHash,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  };
}

export function recipientDecision(
  actor: Actor,
  invitation: Invitation | null,
  existing: Membership | null,
  now: Date,
  decision: "accept" | "dismiss",
): "already_joined" | "accept" | "dismiss" {
  const email = verifiedEmail(actor);
  if (!invitation || invitation.emailKey !== email)
    throw new BusinessError("invite_unavailable");
  if (
    decision === "accept" &&
    invitation.acceptedAt &&
    existing &&
    !existing.removedAt &&
    existing.userId === actor.id &&
    existing.businessId === invitation.businessId
  )
    return "already_joined";
  if (!isPending(invitation, now))
    throw new BusinessError("invite_unavailable");
  if (decision === "accept" && existing && !existing.removedAt)
    throw new BusinessError("already_member");
  return decision;
}

export function requireChanged(count: number): void {
  if (count !== 1) throw new BusinessError("conflict");
}
