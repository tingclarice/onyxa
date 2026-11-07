"use client";

import { useActionState, useState } from "react";
import type { ActionResult, Business, Invitation } from "../types/business";
import {
  createBusinessAction,
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
          Peringatan barang lama tidak dibeli
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
  const [copied, setCopied] = useState<string | null>(null);
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
        Bagikan kode rahasia langsung ke staf. Penerima boleh mendaftar setelah
        diundang; email akunnya harus sama dengan email tujuan ini.
      </p>
      <ActionMessage result={result} />
      {result?.status === "success" && result.code && (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">
            Simpan kode sebelum meninggalkan halaman ini.
          </p>
          <code className="block break-all text-sm select-all">
            {result.code}
          </code>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/undangan#code=${result.code}`,
                );
                setCopied("Tautan disalin.");
              } catch {
                setCopied(
                  "Tidak dapat menyalin tautan. Salin kode di atas secara manual.",
                );
              }
            }}
          >
            Salin tautan undangan
          </Button>
          {copied && (
            <p role="status" className="text-sm">
              {copied}
            </p>
          )}
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Membuat undangan..." : "Undang staf"}
      </Button>
    </form>
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
          Mengundang Anda sebagai staf.
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
            {pending ? "Memproses..." : "Terima undangan"}
          </Button>
          <Button
            name="decision"
            value="dismiss"
            type="submit"
            variant="outline"
            disabled={pending}
          >
            Tolak
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
