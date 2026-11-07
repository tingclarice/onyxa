"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteSupplier,
  getSettings,
  inviteTeamMember,
  saveBusinessProfile,
  savePriceAlerts,
  saveSupplier,
  type BusinessProfile,
  type BusinessType,
  type PriceAlerts,
  type Supplier,
} from "@/lib/api/settings";

const businessSchema = z.object({
  business_name: z.string().min(1, { error: "Nama usaha harus diisi." }),
  business_type: z.enum(["Kafe/Resto", "Toko", "Lainnya"], {
    error: "Pilih jenis usaha.",
  }),
});

const alertsSchema = z.object({
  threshold_percent: z
    .number({ error: "Batas kenaikan harus berupa angka." })
    .min(1, { error: "Batas kenaikan minimal 1%." })
    .max(100, { error: "Batas kenaikan maksimal 100%." }),
  price_increase: z.boolean(),
  slow_moving: z.boolean(),
});

const inviteSchema = z.object({
  email: z
    .string()
    .min(1, { error: "Email harus diisi." })
    .email({ error: "Masukkan alamat email yang benar." }),
});

const supplierSchema = z.object({
  name: z.string().min(1, { error: "Nama pemasok harus diisi." }),
});

type SettingsSection = {
  id: string;
  label: string;
};

const sections: SettingsSection[] = [
  { id: "profil-usaha", label: "Profil usaha" },
  { id: "supplier", label: "Supplier" },
  { id: "peringatan-harga", label: "Peringatan harga" },
  { id: "tim", label: "Tim" },
  { id: "akun", label: "Akun" },
];

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-6 space-y-5 rounded-2xl border bg-card p-4 sm:p-6"
    >
      <header>
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-base text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {children}
    </p>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const inputId = `alert-${label.replaceAll(" ", "-").toLowerCase()}`;

  return (
    <div className="flex min-h-16 items-center justify-between gap-4 border-b py-3 last:border-0">
      <div className="min-w-0">
        <label htmlFor={inputId} className="block text-base font-medium">
          {label}
        </label>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
          checked ? "bg-emerald-700" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function PengaturanPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null,
  );
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  const businessForm = useForm<BusinessProfile>({
    resolver: zodResolver(businessSchema),
    values: settingsQuery.data?.business,
  });
  const alertsForm = useForm<PriceAlerts>({
    resolver: zodResolver(alertsSchema),
    values: settingsQuery.data?.alerts,
  });
  const alertValues = useWatch({ control: alertsForm.control });
  const inviteForm = useForm<{ email: string }>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });
  const supplierForm = useForm<{ name: string }>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "" },
  });

  const businessMutation = useMutation({
    mutationFn: saveBusinessProfile,
    onSuccess: async (business) => {
      queryClient.setQueryData(["settings"], (current: Awaited<
        ReturnType<typeof getSettings>
      > | undefined) => current && { ...current, business });
      toast.success("Pengaturan tersimpan");
    },
    onError: () => toast.error("Pengaturan belum bisa disimpan. Coba lagi."),
  });

  const alertsMutation = useMutation({
    mutationFn: savePriceAlerts,
    onSuccess: async (alerts) => {
      queryClient.setQueryData(["settings"], (current: Awaited<
        ReturnType<typeof getSettings>
      > | undefined) => current && { ...current, alerts });
      toast.success("Pengaturan tersimpan");
    },
    onError: () => toast.error("Pengaturan belum bisa disimpan. Coba lagi."),
  });

  const supplierMutation = useMutation({
    mutationFn: saveSupplier,
    onSuccess: (suppliers) => {
      queryClient.setQueryData(["settings"], (current: Awaited<
        ReturnType<typeof getSettings>
      > | undefined) => current && { ...current, suppliers });
      supplierForm.reset({ name: "" });
      setEditingSupplierId(null);
      setShowSupplierForm(false);
      toast.success("Supplier tersimpan.");
    },
    onError: () => toast.error("Supplier belum bisa disimpan. Coba lagi."),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: (suppliers) => {
      queryClient.setQueryData(["settings"], (current: Awaited<
        ReturnType<typeof getSettings>
      > | undefined) => current && { ...current, suppliers });
      toast.success("Supplier berhasil dihapus.");
    },
    onError: () => toast.error("Supplier belum bisa dihapus. Coba lagi."),
  });

  const inviteMutation = useMutation({
    mutationFn: inviteTeamMember,
    onSuccess: (team) => {
      queryClient.setQueryData(["settings"], (current: Awaited<
        ReturnType<typeof getSettings>
      > | undefined) => current && { ...current, team });
      inviteForm.reset();
      toast.success("Undangan staf berhasil dibuat.");
    },
    onError: (error) =>
      toast.error(error.message || "Undangan belum bisa dibuat."),
  });

  function submitSupplier(values: { name: string }) {
    const editingSupplier = settingsQuery.data?.suppliers.find(
      (supplier) => supplier.id === editingSupplierId,
    );
    const supplier: Supplier = {
      id: editingSupplier?.id ?? `supplier-${crypto.randomUUID()}`,
      name: values.name.trim(),
    };
    supplierMutation.mutate(supplier);
  }

  function startSupplierEdit(supplier: Supplier) {
    setEditingSupplierId(supplier.id);
    setShowSupplierForm(true);
    supplierForm.reset({ name: supplier.name });
  }

  function cancelSupplierEdit() {
    setEditingSupplierId(null);
    setShowSupplierForm(false);
    supplierForm.reset({ name: "" });
  }

  function confirmDeleteSupplier(supplier: Supplier) {
    if (window.confirm(`Hapus supplier "${supplier.name}"?`)) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  }

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    void inviteForm.handleSubmit(({ email }) => inviteMutation.mutate(email))(
      event,
    );
  }

  function confirmLogout() {
    if (window.confirm("Yakin ingin keluar dari akun?")) {
      toast.info("Keluar akun akan tersedia setelah autentikasi terhubung.");
    }
  }

  if (settingsQuery.isPending) {
    return (
      <div
        aria-label="Memuat pengaturan"
        className="mx-auto max-w-6xl animate-pulse space-y-4 px-4 py-8"
      >
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-60 rounded-2xl bg-muted" />
        <div className="h-48 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center"
      >
        <p className="text-base text-muted-foreground">
          Pengaturan belum bisa dimuat. Coba lagi sebentar lagi.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void settingsQuery.refetch()}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  const { suppliers, team } = settingsQuery.data;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-7 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Pengaturan
        </h1>
        <p className="text-base text-muted-foreground">
          Atur informasi usaha dan cara Onyxa membantu Anda.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="Menu pengaturan"
          className="hidden lg:sticky lg:top-6 lg:block"
        >
          <p className="mb-2 px-3 text-sm font-semibold text-muted-foreground">
            MENU
          </p>
          <ul className="space-y-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex h-12 items-center rounded-lg px-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {section.label}
                  <ChevronRight aria-hidden="true" className="ml-auto size-4" />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <SectionCard
            id="profil-usaha"
            title="Profil usaha"
            description="Informasi ini membantu menyesuaikan catatan usaha Anda."
          >
            <form
              className="space-y-4"
              onSubmit={businessForm.handleSubmit((values) =>
                businessMutation.mutate(values),
              )}
              noValidate
            >
              <div className="space-y-2">
                <label
                  htmlFor="business_name"
                  className="block text-base font-medium"
                >
                  Nama usaha
                </label>
                <Input
                  id="business_name"
                  {...businessForm.register("business_name")}
                  aria-invalid={
                    Boolean(businessForm.formState.errors.business_name) ||
                    undefined
                  }
                />
                <FieldError>
                  {businessForm.formState.errors.business_name?.message}
                </FieldError>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="business_type"
                  className="block text-base font-medium"
                >
                  Jenis usaha
                </label>
                <select
                  id="business_type"
                  {...businessForm.register("business_type")}
                  className="h-12 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {(
                    ["Kafe/Resto", "Toko", "Lainnya"] satisfies BusinessType[]
                  ).map((businessType) => (
                    <option key={businessType} value={businessType}>
                      {businessType}
                    </option>
                  ))}
                </select>
                <FieldError>
                  {businessForm.formState.errors.business_type?.message}
                </FieldError>
              </div>
              <Button
                type="submit"
                disabled={businessMutation.isPending}
              >
                <Check aria-hidden="true" />
                Simpan profil
              </Button>
            </form>
          </SectionCard>

          <SectionCard
            id="supplier"
            title="Supplier"
            description="Daftar pemasok yang sering muncul di nota Anda."
          >
            <ul className="space-y-2">
              {suppliers.map((supplier) => (
                <li
                  key={supplier.id}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="min-w-0 break-words text-base font-medium">
                    {supplier.name}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Ubah ${supplier.name}`}
                      className="size-12 p-0"
                      onClick={() => startSupplierEdit(supplier)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Hapus ${supplier.name}`}
                      className="size-12 p-0 text-muted-foreground hover:text-destructive"
                      disabled={deleteSupplierMutation.isPending}
                      onClick={() => confirmDeleteSupplier(supplier)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
              {suppliers.length === 0 && (
                <li className="rounded-lg border border-dashed p-4 text-base text-muted-foreground">
                  Belum ada supplier.
                </li>
              )}
            </ul>

            {showSupplierForm ? (
              <form
                className="space-y-3 rounded-xl border bg-muted/30 p-3 sm:flex sm:items-start sm:gap-3 sm:space-y-0"
                onSubmit={supplierForm.handleSubmit(submitSupplier)}
                noValidate
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <label htmlFor="supplier-name" className="text-base font-medium">
                    Nama supplier
                  </label>
                  <Input
                    id="supplier-name"
                    placeholder="Contoh: Pasar Segar Bu Rina"
                    {...supplierForm.register("name")}
                    aria-invalid={
                      Boolean(supplierForm.formState.errors.name) || undefined
                    }
                  />
                  <FieldError>
                    {supplierForm.formState.errors.name?.message}
                  </FieldError>
                </div>
                <div className="flex gap-2 sm:pt-7">
                  <Button
                    type="submit"
                    disabled={supplierMutation.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    {editingSupplierId ? "Simpan" : "Tambah"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelSupplierEdit}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingSupplierId(null);
                  setShowSupplierForm(true);
                  supplierForm.reset({ name: "" });
                }}
              >
                <Plus aria-hidden="true" />
                Tambah supplier
              </Button>
            )}
          </SectionCard>

          <SectionCard
            id="peringatan-harga"
            title="Peringatan harga"
            description="Tentukan kapan Onyxa perlu mengingatkan Anda."
          >
            <form
              className="space-y-4"
              onSubmit={alertsForm.handleSubmit((values) =>
                alertsMutation.mutate(values),
              )}
              noValidate
            >
              <div className="space-y-2">
                <label
                  htmlFor="threshold_percent"
                  className="block text-base font-medium"
                >
                  Batas kenaikan harga
                </label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    id="threshold_percent"
                    type="number"
                    min="1"
                    max="100"
                    inputMode="numeric"
                    {...alertsForm.register("threshold_percent", {
                      valueAsNumber: true,
                    })}
                  />
                  <span className="text-base font-medium">%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Beri tahu saya saat harga naik sebesar ini atau lebih.
                </p>
                <FieldError>
                  {alertsForm.formState.errors.threshold_percent?.message}
                </FieldError>
              </div>

              <div className="divide-y">
                <ToggleRow
                  label="Harga naik"
                  description="Beri tahu jika harga supplier melewati batas."
                  checked={alertValues.price_increase ?? true}
                  onChange={(checked) =>
                    alertsForm.setValue("price_increase", checked, {
                      shouldDirty: true,
                    })
                  }
                />
                <ToggleRow
                  label="Barang mandek"
                  description="Ingatkan jika barang lama tidak dibeli."
                  checked={alertValues.slow_moving ?? true}
                  onChange={(checked) =>
                    alertsForm.setValue("slow_moving", checked, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
              <Button type="submit" disabled={alertsMutation.isPending}>
                <Check aria-hidden="true" />
                Simpan peringatan
              </Button>
            </form>
          </SectionCard>

          <SectionCard
            id="tim"
            title="Tim"
            description="Atur siapa saja yang membantu mencatat belanja."
          >
            <ul className="space-y-2">
              {team.map((member) => (
                <li
                  key={member.id}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-3"
                >
                  <span className="min-w-0 break-all text-base">
                    {member.email}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-medium">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>

            <form
              className="space-y-3 rounded-xl border bg-muted/30 p-3"
              onSubmit={submitInvite}
              noValidate
            >
              <div className="space-y-2">
                <label htmlFor="invite-email" className="text-base font-medium">
                  Email staf
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  inputMode="email"
                  placeholder="nama@email.com"
                  {...inviteForm.register("email")}
                  aria-invalid={
                    Boolean(inviteForm.formState.errors.email) || undefined
                  }
                />
                <FieldError>
                  {inviteForm.formState.errors.email?.message}
                </FieldError>
              </div>
              <Button
                type="submit"
                variant="outline"
                disabled={inviteMutation.isPending}
              >
                <UserPlus aria-hidden="true" />
                Undang staf
              </Button>
            </form>
            <p className="text-sm text-muted-foreground">
              Undangan hanya contoh dan belum dikirim ke email.
            </p>
          </SectionCard>

          <SectionCard
            id="akun"
            title="Akun"
            description="Atur akses dan keamanan akun Anda."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-medium">Kata sandi</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Perbarui kata sandi akun Anda.
                </p>
              </div>
              <Link
                href="/masuk#lupa-password"
                className="inline-flex min-h-12 items-center gap-2 text-base font-semibold text-accent underline-offset-4 hover:underline"
              >
                Ubah kata sandi
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={confirmLogout}
              >
                <LogOut aria-hidden="true" />
                Keluar
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
