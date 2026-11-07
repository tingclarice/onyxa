import {
  alertPreferencesSchema,
  businessProfileSchema,
  type Actor,
  type AlertPreferences,
  type BusinessProfileInput,
  type BusinessRepository,
  type BusinessStore,
  type Workspace,
  type BusinessSettings,
  type InvitationSecrets,
} from "../types/business";
import {
  canManageBusiness,
  createBusinessPlan,
  createInvitationPlan,
  emailKey,
  isPending,
  recipientDecision,
  requireChanged,
  requireMembership,
  requireOwner,
  requirePendingInvitation,
  selectMembership,
  accountEmail,
} from "../core/access";

export async function getWorkspace(
  actor: Actor,
  selectedId: string | undefined,
  now: Date,
  repository: BusinessRepository,
  invitationHash?: string,
): Promise<Workspace> {
  const [memberships, invitation] = await Promise.all([
    repository.listMemberships(actor.id),
    actor.email && invitationHash
      ? repository.findRecipientInvitation(
          invitationHash,
          emailKey(actor.email),
        )
      : Promise.resolve(null),
  ]);
  return {
    memberships,
    active: selectMembership(memberships, selectedId),
    invitations: invitation && isPending(invitation, now) ? [invitation] : [],
  };
}

export async function getMembership(
  actor: Actor,
  businessId: string,
  repository: BusinessRepository,
) {
  return requireMembership(
    await repository.findMembership(businessId, actor.id),
    actor,
    businessId,
  );
}

export async function createBusiness(
  actor: Actor,
  input: BusinessProfileInput,
  store: BusinessStore,
) {
  const plan = createBusinessPlan(actor, input);
  return store.transaction((repository) =>
    repository.createBusiness(plan.profile, plan.owner),
  );
}

export async function getBusinessSettings(
  actor: Actor,
  businessId: string,
  now: Date,
  repository: BusinessRepository,
): Promise<BusinessSettings> {
  const membership = await getMembership(actor, businessId, repository);
  const members = await repository.listMembers(businessId);
  const invitations = canManageBusiness(membership)
    ? await repository.listBusinessInvitations(businessId)
    : [];
  return {
    membership,
    members,
    invitations: invitations.filter((invitation) => isPending(invitation, now)),
  };
}

export async function updateBusiness(
  actor: Actor,
  businessId: string,
  input: BusinessProfileInput,
  store: BusinessStore,
): Promise<void> {
  await store.transaction(async (repository) => {
    requireOwner(
      await repository.findMembership(businessId, actor.id),
      actor,
      businessId,
    );
    await repository.updateProfile(
      businessId,
      businessProfileSchema.parse(input),
    );
  });
}

export async function updateAlerts(
  actor: Actor,
  businessId: string,
  input: AlertPreferences,
  store: BusinessStore,
): Promise<void> {
  await store.transaction(async (repository) => {
    requireOwner(
      await repository.findMembership(businessId, actor.id),
      actor,
      businessId,
    );
    await repository.updateAlerts(
      businessId,
      alertPreferencesSchema.parse(input),
    );
  });
}

export async function inviteMember(
  actor: Actor,
  businessId: string,
  email: string,
  now: Date,
  secrets: InvitationSecrets,
  store: BusinessStore,
): Promise<string> {
  const secret = secrets.issue();
  await store.transaction(async (repository) => {
    const member = requireOwner(
      await repository.findMembership(businessId, actor.id),
      actor,
      businessId,
    );
    const existing = await repository.findMemberByEmail(
      businessId,
      emailKey(email),
    );
    const invitations = await repository.listBusinessInvitations(businessId);
    const plan = createInvitationPlan(
      actor,
      member,
      businessId,
      email,
      existing,
      invitations,
      now,
      secret.hash,
    );
    await repository.createInvitation(plan);
  });
  return secret.code;
}

export async function previewInvitation(
  actor: Actor,
  tokenHash: string,
  now: Date,
  repository: BusinessRepository,
) {
  const invitation = await repository.findRecipientInvitation(
    tokenHash,
    accountEmail(actor),
  );
  requirePendingInvitation(invitation, now);
  return invitation;
}

export async function respondToInvitation(
  actor: Actor,
  tokenHash: string,
  decision: "accept" | "dismiss",
  now: Date,
  store: BusinessStore,
  expectedInvitationId: string,
): Promise<string | null> {
  const email = accountEmail(actor);
  return store.transaction(async (repository) => {
    const invitation = await repository.findRecipientInvitation(
      tokenHash,
      email,
    );
    const existing = invitation
      ? await repository.findMembership(invitation.businessId, actor.id)
      : null;
    const outcome = recipientDecision(
      actor,
      invitation,
      existing,
      now,
      decision,
      expectedInvitationId,
    );
    if (!invitation) return null;
    if (outcome === "already_joined") return invitation.businessId;
    requireChanged(
      await repository.closeInvitation(
        invitation.id,
        invitation.businessId,
        now,
        outcome === "accept" ? "accepted" : "revoked",
      ),
    );
    if (outcome === "dismiss") return null;
    await repository.saveMembership(
      invitation.businessId,
      actor.id,
      email,
      invitation.role,
    );
    return invitation.businessId;
  });
}

export async function revokeInvitation(
  actor: Actor,
  businessId: string,
  invitationId: string,
  now: Date,
  store: BusinessStore,
): Promise<void> {
  await store.transaction(async (repository) => {
    requireOwner(
      await repository.findMembership(businessId, actor.id),
      actor,
      businessId,
    );
    const invitation = await repository.findBusinessInvitation(
      invitationId,
      businessId,
    );
    requirePendingInvitation(invitation, now);
    requireChanged(
      await repository.closeInvitation(
        invitationId,
        businessId,
        now,
        "revoked",
      ),
    );
  });
}
