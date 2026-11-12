import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ItemNotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PackageX aria-hidden="true" className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Barang tidak ditemukan
        </h1>
        <p className="text-base text-muted-foreground">
          Barang yang Anda cari tidak tersedia atau sudah dihapus dari daftar
          usaha Anda.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/barang">
          <ArrowLeft aria-hidden="true" />
          Kembali ke daftar barang
        </Link>
      </Button>
    </div>
  );
}

