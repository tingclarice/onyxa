import { z } from "zod";

export const businessProfileSchema = z.object({
  name: z.string().trim().min(1, "Nama usaha harus diisi.").max(200),
  businessType: z.enum(["CAFE_RESTAURANT", "STORE", "OTHER"]),
});
export const invitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Masukkan email yang benar.")
    .max(254),
});
export const identifierSchema = z.uuid("Pilihan tidak valid.");
export const alertPreferencesSchema = z.object({
  priceIncreaseThresholdPercent: z.number().min(1).max(100),
  priceIncreaseAlertsEnabled: z.boolean(),
  slowMovingAlertsEnabled: z.boolean(),
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type AlertPreferences = z.infer<typeof alertPreferencesSchema>;
export type MemberRole = "OWNER" | "STAFF";
export interface Actor {
  id: string;
  email: string | null;
}
export interface Business extends BusinessProfileInput, AlertPreferences {
  id: string;
}
export interface Membership {
  id: string;
  businessId: string;
  userId: string;
  email: string;
  role: MemberRole;
  removedAt: string | null;
  business: Business;
}
export interface Invitation {
  id: string;
  businessId: string;
  businessName: string;
  invitedByMemberId: string;
  inviterIsOwner: boolean;
  email: string;
  emailKey: string;
  role: MemberRole;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}
export interface NewInvitation {
  businessId: string;
  invitedByMemberId: string;
  email: string;
  emailKey: string;
  role: MemberRole;
  expiresAt: Date;
}
export interface Workspace {
  memberships: Membership[];
  active: Membership | null;
  invitations: Invitation[];
}
export interface BusinessSettings {
  membership: Membership;
  members: Membership[];
  /** Open invitations. Always empty for staff. */
  invitations: Invitation[];
  /** True for owners: may edit the profile, alerts and invitations. */
  canManage: boolean;
}
export interface ActionResult {
  status: "success" | "error";
  message: string;
}

export type BusinessErrorCode =
  | "not_member"
  | "owner_required"
  | "missing_email"
  | "invite_unavailable"
  | "already_member"
  | "already_invited"
  | "cannot_invite_self"
  | "conflict";
export class BusinessError extends Error {
  constructor(readonly code: BusinessErrorCode) {
    super(code);
    this.name = "BusinessError";
  }
}
