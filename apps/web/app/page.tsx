import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  BellRing,
  Camera,
  Check,
  CircleAlert,
  ClipboardCheck,
  PackageSearch,
  ReceiptText,
  Store,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";

const painPoints = [
  {
    icon: ReceiptText,
    title: "Nota menumpuk",
    description:
      "Nota kecil mudah hilang, sementara mencatat satu per satu makan waktu.",
  },
  {
    icon: ArrowDownRight,
    title: "Harga supplier naik tanpa sadar",
    description:
      "Perubahan harga sering baru terasa saat uang belanja makin cepat habis.",
  },
  {
    icon: PackageSearch,
    title: "Modal tertahan di barang yang tidak laku",
    description:
      "Barang yang lama tersimpan membuat modal usaha sulit berputar.",
  },
];

const steps = [
  {
    icon: Camera,
    number: "01",
    title: "Foto nota",
    description: "Ambil foto nota belanja dengan HP.",
  },
  {
    icon: ClipboardCheck,
    number: "02",
    title: "Cek hasilnya",
    description: "Pastikan pemasok, barang, dan jumlahnya sudah sesuai.",
  },
  {
    icon: BellRing,
    number: "03",
    title: "Dapat peringatan",
    description: "Ketahui lebih cepat saat harga berubah atau barang mandek.",
  },
];

const features = [
  {
    icon: ScanLineIcon,
    title: "Scanner nota",
    description: "Ubah foto nota menjadi catatan belanja yang mudah dicek.",
  },
  {
    icon: ArrowDownRight,
    title: "Alert harga",
    description: "Lihat jika harga dari pemasok berubah dibanding pembelian sebelumnya.",
  },
  {
    icon: PackageSearch,
    title: "Barang mandek",
    description: "Ketahui barang yang sudah lama tidak dibeli kembali.",
  },
  {
    icon: Wallet,
    title: "Pengeluaran",
    description: "Lihat catatan uang keluar usaha dengan lebih rapi.",
  },
];

function ScanLineIcon({ className }: { className?: string }) {
  return <Camera aria-hidden="true" className={className} />;
}

function PhonePreview() {
  return (
    <div
      aria-label="Contoh tampilan cek nota di Onyxa"
      className="relative mx-auto w-full max-w-[310px] rounded-[2.5rem] border-[8px] border-zinc-900 bg-zinc-900 p-2 shadow-2xl shadow-zinc-900/15"
    >
      <div className="absolute left-1/2 top-1 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-zinc-900" />
      <div className="min-h-[510px] overflow-hidden rounded-[1.9rem] bg-background px-4 pb-5 pt-9">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Cek struk belanja</p>
            <p className="text-base font-bold">Info nota</p>
          </div>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
            Perlu dicek
          </span>
        </div>

        <div className="space-y-3 rounded-xl border p-3">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Nama pemasok</p>
            <div className="flex h-10 items-center rounded-md border border-amber-400 px-2 text-sm">
              Pasar Segar Bu Rina
            </div>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-800">
              <CircleAlert aria-hidden="true" className="size-3" />
              Perlu dicek
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Total nota</p>
            <div className="flex h-10 items-center rounded-md border px-2 text-sm font-medium">
              Rp207.000
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-bold">Barang di nota</p>
          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Telur ayam</p>
                <p className="mt-1 text-xs text-muted-foreground">2 kg</p>
              </div>
              <p className="text-sm font-semibold">{formatRupiah(56000)}</p>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              → Telur ayam
            </div>
          </div>
          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Ayam potong</p>
                <p className="mt-1 text-xs text-muted-foreground">3 kg</p>
              </div>
              <p className="text-sm font-semibold">{formatRupiah(114000)}</p>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              → Ayam potong
            </div>
          </div>
        </div>

        <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          <Check aria-hidden="true" className="size-4" />
          Simpan
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            O
          </span>
          Onyxa
        </Link>
        <nav aria-label="Navigasi" className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/masuk"
            className="inline-flex h-12 items-center px-3 text-base font-medium text-muted-foreground hover:text-foreground"
          >
            Masuk
          </Link>
          <Button asChild>
            <Link href="/daftar">Coba Gratis</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-12 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            <Store aria-hidden="true" className="size-4" />
            Catatan belanja untuk usaha kecil
          </p>
          <h1 className="text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            Foto nota, Onyxa yang catat. Anda tinggal lihat hasilnya.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Catat belanja usaha dari foto nota dan tahu lebih cepat saat ada
            perubahan.
          </p>
          <Button asChild className="mt-8 min-w-40">
            <Link href="/daftar">
              Coba Gratis
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="py-2">
          <PhonePreview />
        </div>
      </section>

      <section className="border-y bg-zinc-50/70">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-9 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Kenal rasanya?
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Hal kecil yang bikin usaha terasa berat
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {painPoints.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border bg-background p-5 sm:p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-muted">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Gampang dimulai
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Cara kerja Onyxa
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          {steps.map(({ icon: Icon, number, title, description }) => (
            <article key={number} className="relative">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                <Icon aria-hidden="true" className="size-6" />
              </div>
              <p className="mt-5 text-sm font-semibold text-accent">{number}</p>
              <h3 className="mt-1 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-base leading-7 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y bg-zinc-50/70">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-9 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Satu tempat untuk catatan belanja
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Biar keputusan usaha lebih jelas
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border bg-background p-5"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-muted">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:flex-row md:items-center md:py-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Mulai catat belanja dengan lebih rapi.
            </h2>
            <p className="mt-3 text-base leading-7 text-primary-foreground/75">
              Foto nota pertama Anda dan biarkan Onyxa membantu merapikannya.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="w-full shrink-0 md:w-auto"
          >
            <Link href="/daftar">
              Coba Gratis
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-7 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              O
            </span>
            Onyxa
          </Link>
          <p>Catatan belanja yang lebih rapi untuk usaha Anda.</p>
          {/* TODO: Replace the placeholder URL with Onyxa's WhatsApp number. */}
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline"
          >
            Hubungi kami di WhatsApp
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      </footer>
    </main>
  );
}
