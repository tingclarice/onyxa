import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateBusinessForm } from "@/features/business-management/ui/business-forms";

/** /bisnis/baru — create another business (the creator becomes its owner). */
export default function CreateBusinessPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8 sm:px-8">
      <header className="space-y-3">
        <Link
          href="/beranda"
          className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          Kembali
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Buat usaha baru</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Anda akan menjadi pemilik dan dapat mengundang anggota setelah usaha
            dibuat.
          </p>
        </div>
      </header>
      <CreateBusinessForm cancelHref="/beranda" />
    </div>
  );
}
