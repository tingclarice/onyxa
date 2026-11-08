"use client";

import { useActionState } from "react";
import Link from "next/link";
import type {
  ActionResult,
  Business,
  Invitation,
  Membership,
} from "../types/business";
import {
  createBusinessAction,
  switchBusinessAction,
  inviteMemberAction,
  respondInvitationAction,
  revokeInvitationAction,
  updateAlertsAction,
  updateProfileAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ActionMessage({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p
      role={result.status === "error" ? "alert" : "status"}
      className={`text-sm ${result.status === "error" ? "text-destructive" : "text-accent"}`}
    >
      {result.message}
    </p>
  );
}

function ProfileFields({
  business,
  disabled,
}: {
  business?: Business;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="business-name" className="block text-sm font-medium">
          Nama usaha
        </label>
        <Input
          id="business-name"
          name="name"
          required
          maxLength={200}
          autoComplete="organization"
          defaultValue={business?.name}
          placeholder="Nama usaha Anda"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="business-type" className="block text-sm font-medium">
          Jenis usaha
        </label>
        <select
          id="business-type"
          name="businessType"
          defaultValue={business?.businessType ?? "OTHER"}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base disabled:opacity-50"
        >
          <option value="CAFE_RESTAURANT">Kafe / restoran</option>
          <option value="STORE">Toko</option>
          <option value="OTHER">Lainnya</option>
        </select>
      </div>
    </fieldset>
  );
}

export function CreateBusinessForm() {
  const [result, action, pending] = useActionState(createBusinessAction, null);
  return (
    <form action={action} className="space-y-4">
      <ProfileFields disabled={pending} />
      <ActionMessage result={result} />
      <Button type="submit" disabled={pending}>
        {pending ? "Membuat usaha..." : "Buat usaha"}
      </Button>
    </form>
  );
}

export function BusinessProfileForm({
  business,
  owner,
}: {
  business: Business;
  owner: boolean;
}) {
  const [result, action, pending] = useActionState(updateProfileAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="businessId" value={business.id} />
      <ProfileFields business={business} disabled={pending || !owner} />
      <ActionMessage result={result} />
      {owner && (
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan profil"}
        </Button>
      )}
    </form>
  );
}

export function AlertPreferencesForm({
  business,
  owner,
}: {
  business: Business;
  owner: boolean;
}) {
  const [result, action, pending] = useActionState(updateAlertsAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="businessId" value={business.id} />
      <fieldset disabled={pending || !owner} className="space-y-4">
        <label
          className="block space-y-2 text-sm font-medium"
          htmlFor="price-threshold"
        >
          <span>Batas kenaikan harga (%)</span>
          <Input
            id="price-threshold"
            name="priceIncreaseThresholdPercent"
            type="number"
            required
            min={1}
            max={100}
            step="0.01"
            defaultValue={business.priceIncreaseThresholdPercent}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            className="size-4 accent-emerald-700"
            type="checkbox"
            name="priceIncreaseAlertsEnabled"
            defaultChecked={business.priceIncreaseAlertsEnabled}
          />
          Peringatan harga naik
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            className="size-4 accent-emerald-700"
            type="checkbox"
            name="slowMovingAlertsEnabled"
            defaultChecked={business.slowMovingAlertsEnabled}
          />
          Peringatan barang melambat
        </label>
        <label
          className="block space-y-2 text-sm font-medium"
          htmlFor="slow-moving-grace"
        >
          <span>Toleransi keterlambatan restock (%)</span>
          <Input
            id="slow-moving-grace"
            name="slowMovingGracePercent"
            type="number"
            required
            min={0}
            max={300}
            step="1"
            defaultValue={business.slowMovingGracePercent}
          />
          <span className="block text-xs font-normal leading-5 text-muted-foreground">
            Barang ditandai melambat jika belum dibeli lagi melewati perkiraan
            habis ditambah persen ini. Contoh: biasanya habis 10 hari dan
            toleransi 20% → ditandai setelah lebih dari 12 hari.
          </span>
        </label>
      </fieldset>
      <ActionMessage result={result} />
      {owner && (
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan peringatan"}
        </Button>
      )}
    </form>
  );
}

export function InviteMemberForm({ businessId }: { businessId: string }) {
  const [result, action, pending] = useActionState(inviteMemberAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="businessId" value={businessId} />
      <label htmlFor="invite-email" className="block text-sm font-medium">
        Email staf
      </label>
      <Input
        id="invite-email"
        name="email"
        type="email"
        autoComplete="off"
        placeholder="nama@email.com"
        required
        maxLength={254}
        disabled={pending}
      />
      <p className="text-sm text-muted-foreground">
        Penerima akan melihat undangan di inbox akun dengan email ini. Penerima
        juga boleh mendaftar setelah diundang.
      </p>
      <ActionMessage result={result} />
      <Button type="submit" disabled={pending}>
        {pending ? "Membuat undangan..." : "Undang staf"}
      </Button>
    </form>
  );
}

export function BusinessSwitcher({
  memberships,
  activeBusinessId,
}: {
  memberships: Membership[];
  activeBusinessId: string;
}) {
  const [result, action, pending] = useActionState(switchBusinessAction, null);
  return (
    <div className="space-y-3">
      {memberships.length > 1 && (
        <form action={action} className="space-y-3">
          <label
            htmlFor="active-business"
            className="block text-sm font-medium"
          >
            Usaha aktif
          </label>
          <div className="flex flex-wrap gap-3">
            <select
              id="active-business"
              name="businessId"
              defaultValue={activeBusinessId}
              disabled={pending}
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base"
            >
              {memberships.map((member) => (
                <option key={member.id} value={member.businessId}>
                  {member.business.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Memproses..." : "Ganti usaha"}
            </Button>
          </div>
          <ActionMessage result={result} />
        </form>
      )}
      <Button asChild variant="outline">
        <Link href="/bisnis/baru">Buat usaha baru</Link>
      </Button>
    </div>
  );
}

export function InvitationCard({ invitation }: { invitation: Invitation }) {
  const [result, action, pending] = useActionState(
    respondInvitationAction,
    null,
  );
  return (
    <li className="space-y-3 rounded-xl border p-4">
      <div>
        <h3 className="break-words font-semibold">{invitation.businessName}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Mengundang Anda sebagai staf. Apakah Anda ingin bergabung?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Berlaku sampai{" "}
          {new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeZone: "Asia/Jakarta",
          }).format(new Date(invitation.expiresAt))}
        </p>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="invitationId" value={invitation.id} />
        <div className="flex flex-wrap gap-2">
          <Button
            name="decision"
            value="accept"
            type="submit"
            disabled={pending}
          >
            {pending ? "Memproses..." : "Yes"}
          </Button>
          <Button
            name="decision"
            value="dismiss"
            type="submit"
            variant="outline"
            disabled={pending}
          >
            No
          </Button>
        </div>
        <ActionMessage result={result} />
      </form>
    </li>
  );
}

export function RevokeInvitationForm({
  invitation,
}: {
  invitation: Invitation;
}) {
  const [result, action, pending] = useActionState(
    revokeInvitationAction,
    null,
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="businessId" value={invitation.businessId} />
      <input type="hidden" name="invitationId" value={invitation.id} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Membatalkan..." : "Batalkan undangan"}
      </Button>
      <ActionMessage result={result} />
    </form>
  );
}
