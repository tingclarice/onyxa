// TEST ONLY. Small shared records for business-management tests.
import type { Actor, Business, Invitation, Membership } from "../types/business";

export const now = new Date("2026-11-07T00:00:00Z");
export const oneWeekLater = new Date("2026-11-14T00:00:00Z");

export const owner: Actor = { id: "owner", email: "owner@example.com" };
export const staff: Actor = { id: "staff", email: "staff@example.com" };

export const business: Business = {
  id: "business",
  name: "Warung Sari",
  businessType: "STORE",
  priceIncreaseThresholdPercent: 5,
  priceIncreaseAlertsEnabled: true,
  slowMovingAlertsEnabled: true,
  slowMovingGracePercent: 20,
};

export const ownerMembership: Membership = {
  id: "owner-member",
  businessId: business.id,
  userId: owner.id,
  email: "owner@example.com",
  role: "OWNER",
  removedAt: null,
  business,
};

export const openInvitation: Invitation = {
  id: "invite",
  businessId: business.id,
  businessName: business.name,
  invitedByMemberId: ownerMembership.id,
  inviterIsOwner: true,
  email: "staff@example.com",
  emailKey: "staff@example.com",
  role: "STAFF",
  expiresAt: oneWeekLater.toISOString(),
  acceptedAt: null,
  revokedAt: null,
};
