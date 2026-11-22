import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  LayoutDashboard,
  Users,
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
import { getCurrentUser } from "@/features/auth/server";
import { AccountAvatar } from "@/features/auth/ui/account-avatar";
import "./landing-entrances.css";

export const metadata: Metadata = {
  title: "Onyxa | Manajemen Kantin Sekolah",
  description:
    "Catat belanja usaha dari foto nota dan tahu lebih cepat saat ada perubahan.",
};

const painPoints = [
  {
    icon: Users,
    title: "Antrean saat jam ramai",
    description: "Saat siswa datang bersamaan, kasir harus memilih antara memasukkan setiap barang ke POS dan segera melayani pembeli berikutnya.",
  },
  {
    icon: Wallet,
    title: "Arus kas sulit dicatat",
    description: "Setoran tunai, mutasi QRIS, dan nota belanja tersimpan terpisah. Pengelola harus mencocokkan ketiganya untuk melihat uang yang masuk dan keluar.",
  },
  {
    icon: ClipboardCheck,
    title: "Transaksi pegawai sulit dipantau",
    description: "Tanpa catatan POS per giliran kerja, pengelola sulit memeriksa transaksi yang ditangani pegawai ketika ada selisih setoran.",
  },
];

const steps = [
  {
    icon: Camera,
    title: "Foto nota",
    description: "Ambil foto nota belanja, periksa nama barang, jumlah, dan harga belinya, lalu simpan.",
  },
  {
    icon: PackageSearch,
    title: "Lacak pergerakan barang",
    description: "Dari jumlah dan jarak waktu antarbelanja, Onyxa mengenali barang yang sering dibeli ulang dan menandai barang yang pergerakannya mulai melambat.",
  },
  {
    icon: LayoutDashboard,
    title: "Lihat kondisi toko",
    description: "Buka dashboard untuk melihat belanja terbaru, perubahan harga pemasok, dan barang yang perlu diperiksa sebelum kulakan lagi.",
  },
];

const dashboardMetrics = [
  {
    icon: ReceiptText,
    title: "Total pengeluaran bulanan",
    description: "Berapa rupiah yang dikeluarkan bulan ini? Lihat total belanja stok dan pengeluaran lain dari nota yang tercatat.",
  },
  {
    icon: Wallet,
    title: "Actual gross profit",
    description: "Laba kotor aktual dihitung dari pendapatan penjualan dikurangi harga pokok barang yang terjual pada periode yang sama.",
  },
  {
    icon: ClipboardCheck,
    title: "Expected revenue vs actual cash",
    description: "Bandingkan perkiraan pendapatan penjualan dengan penerimaan yang tercatat dari tunai dan QRIS. Selisihnya membantu menentukan setoran mana yang perlu diperiksa.",
  },
  {
    icon: PackageSearch,
    title: "Inventory velocity",
    description: "Lihat perkiraan kecepatan pergerakan tiap barang dari jumlah dan frekuensi pembelian ulang. Bandingkan juga jeda restock dan total belanja per barang.",
  },
];

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
          <nav aria-label="Navigasi" data-landing-enter="60" className="flex h-12 items-center">
            <Suspense fallback={<span aria-hidden="true" className="size-12" />}>
              <LandingAccountLink />
            </Suspense>
          </nav>
        </header>

        <div className="landing-hero-content mx-auto grid w-full max-w-7xl content-center items-center gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="max-w-2xl">
            <h1 id="landing-title" data-landing-enter="0" className="text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Foto nota. Onyxa yang catat.
            </h1>
            <p data-landing-enter="65" className="mt-4 max-w-xl text-lg leading-8 text-zinc-700 sm:mt-6 dark:text-zinc-300">
              Catat belanja usaha dari foto nota dan tahu lebih cepat saat ada perubahan.
            </p>
            <div data-landing-enter="125" className="mt-5 min-h-12 sm:mt-8">
              <Suspense>
                <LandingCallToAction className="min-w-40" />
              </Suspense>
            </div>
          </div>
          <div data-landing-enter="175" className="landing-hero-artwork mx-auto">
            <ReceiptIllustration />
          </div>
        </div>
      </section>

      <section className="landing-band landing-band--queue bg-stone-200 dark:bg-stone-900">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-9 max-w-2xl">
            <h2 data-landing-enter="55" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Kelemahan aplikasi POS di kantin
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

      <section className="landing-band landing-band--workflow bg-emerald-950 text-emerald-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 data-landing-enter="55" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Cara kerja Onyxa
            </h2>
          </div>
          <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li key={title} data-landing-enter={index * 60}>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Icon aria-hidden="true" className="size-6" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{index + 1}. {title}</h3>
                <p className="mt-2 text-base leading-7 text-emerald-100">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-band landing-band--metrics bg-emerald-100 dark:bg-emerald-900">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-9 max-w-2xl">
            <h2 data-landing-enter="55" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Metrik yang akan hadir di dashboard
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardMetrics.map(({ icon: Icon, title, description }, index) => (
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

      <section className="landing-band landing-band--receipt bg-zinc-100 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:py-20 lg:px-8">
          <div className="max-w-2xl">
            <h2 data-landing-enter="55" className="text-3xl font-bold tracking-tight sm:text-4xl">
              Mulai dari belanja kantin
            </h2>
            <p data-landing-enter="95" className="mt-3 text-base leading-7 text-zinc-700 dark:text-zinc-300">
              Simpan nota kulakan pertama Anda. Setiap belanja berikutnya menambah riwayat yang bisa dipakai untuk melihat pola restock.
            </p>
          </div>
          <div data-landing-enter="125" className="min-h-12 w-full shrink-0 md:w-auto">
            <Suspense>
              <LandingCallToAction className="w-full md:w-auto" />
            </Suspense>
          </div>
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
          <p data-landing-enter="65">Pencatatan barang masuk dan analitik untuk kantin sekolah.</p>
        </div>
      </footer>
    </main>
  );
}

async function LandingAccountLink() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <Link
        href="/pengaturan"
        aria-label={`Pengaturan akun ${user.name}`}
        className="inline-grid size-12 place-items-center rounded-full hover:bg-emerald-100/60 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-emerald-900/60"
      >
        <AccountAvatar name={user.name} imageUrl={user.profileImageUrl} />
      </Link>
    );
  }

  return (
    <Link
      href="/masuk"
      className="inline-flex h-12 items-center px-3 text-base font-medium text-zinc-700 hover:text-foreground dark:text-zinc-300"
    >
      Masuk
    </Link>
  );
}

async function LandingCallToAction({ className }: { className: string }) {
  const user = await getCurrentUser();

  return (
    <Button asChild className={className}>
      <Link href={user ? "/beranda" : "/daftar"}>
        {user ? "Buka Dashboard" : "Mulai mencatat"}
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );
}
