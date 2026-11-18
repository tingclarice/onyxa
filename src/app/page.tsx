import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  BellRing,
  Camera,
  Check,
  ClipboardCheck,
  PackageSearch,
  ReceiptText,
  Scan,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingEntrances } from "@/components/landing-entrances";
import { LandingReceiptField } from "@/components/landing-receipt-field";
import "./landing-entrances.css";

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

function ReceiptIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto grid aspect-[5/4] w-full max-w-lg place-items-center overflow-hidden rounded-[2rem] bg-emerald-100 dark:bg-emerald-950"
    >
      <Scan className="absolute size-[64%] text-emerald-300/75 dark:text-emerald-700" strokeWidth={0.55} />
      <ReceiptText className="size-[32%] text-emerald-900 dark:text-emerald-100" strokeWidth={1.3} />
      <span data-landing-enter="260" data-scan-beam className="absolute top-1/2 h-1 w-[23%] rounded-full bg-emerald-400/80" />
      <div data-landing-enter="590" className="absolute bottom-[23%] right-[24%] grid size-[12%] place-items-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-1/2" strokeWidth={2.5} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background">
      <LandingEntrances />
      <section
        data-landing-hero
        aria-labelledby="landing-title"
        className="landing-hero relative isolate grid overflow-clip bg-[#f4faf6] dark:bg-[#101b16]"
      >
        <LandingReceiptField />
        <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link
            href="/"
            data-landing-enter="0"
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              O
            </span>
            Onyxa
          </Link>
          <nav aria-label="Navigasi">
            <Link
              href="/masuk"
              data-landing-enter="60"
              className="inline-flex h-12 items-center px-3 text-base font-medium text-zinc-700 hover:text-foreground dark:text-zinc-300"
            >
              Masuk
            </Link>
          </nav>
        </header>

        <div className="landing-hero-content mx-auto grid w-full max-w-7xl content-center items-center gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="max-w-2xl">
            <h1 id="landing-title" data-landing-enter="0" className="text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Foto nota. Onyxa yang catat.
            </h1>
            <p data-landing-enter="65" className="mt-4 max-w-xl text-lg leading-8 text-zinc-700 sm:mt-6 dark:text-zinc-300">
              Catat belanja usaha dari foto nota dan tahu lebih cepat saat ada
              perubahan.
            </p>
            <Button asChild className="mt-5 min-w-40 sm:mt-8">
              <Link href="/daftar" data-landing-enter="125">
                Coba Gratis
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div data-landing-enter="175" className="landing-hero-artwork mx-auto">
            <ReceiptIllustration />
          </div>
        </div>
      </section>

      <section className="bg-stone-200 dark:bg-stone-900">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-9 max-w-2xl">
            <p data-landing-enter="0" className="text-sm font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-300">
              Kenal rasanya?
            </p>
            <h2 data-landing-enter="55" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Hal kecil yang bikin usaha terasa berat
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {painPoints.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                data-landing-enter={index * 60}
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

      <section className="bg-emerald-950 text-emerald-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p data-landing-enter="0" className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              Gampang dimulai
            </p>
            <h2 data-landing-enter="55" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Cara kerja Onyxa
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 md:gap-6">
            {steps.map(({ icon: Icon, number, title, description }, index) => (
              <article key={number} data-landing-enter={index * 60}>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Icon aria-hidden="true" className="size-6" />
                </div>
                <p className="mt-5 text-sm font-semibold text-emerald-300">{number}</p>
                <h3 className="mt-1 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-base leading-7 text-emerald-100">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-emerald-100 dark:bg-emerald-900">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-9 max-w-2xl">
            <p data-landing-enter="0" className="text-sm font-semibold uppercase tracking-wide text-emerald-950 dark:text-emerald-100">
              Satu tempat untuk catatan belanja
            </p>
            <h2 data-landing-enter="55" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Biar keputusan usaha lebih jelas
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                data-landing-enter={index * 60}
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

      <section className="bg-zinc-100 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:py-20 lg:px-8">
          <div className="max-w-2xl">
            <h2 data-landing-enter="55" className="text-3xl font-bold tracking-tight sm:text-4xl">
              Mulai catat belanja dengan lebih rapi.
            </h2>
            <p data-landing-enter="95" className="mt-3 text-base leading-7 text-zinc-700 dark:text-zinc-300">
              Foto nota pertama Anda dan biarkan Onyxa membantu merapikannya.
            </p>
          </div>
          <Button
            asChild
            className="w-full shrink-0 md:w-auto"
          >
            <Link href="/daftar" data-landing-enter="125">
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
            data-landing-enter="0"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              O
            </span>
            Onyxa
          </Link>
          <p data-landing-enter="65">Catatan belanja yang lebih rapi untuk usaha Anda.</p>
        </div>
      </footer>
    </main>
  );
}
