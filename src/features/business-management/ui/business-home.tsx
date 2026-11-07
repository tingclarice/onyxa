import "server-only";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getBusinessWorkspace, getSettings } from "./queries";

export async function BusinessHome() {
  const { active } = await getBusinessWorkspace();
  if (!active) return null;
  const { members, invitations } = await getSettings();
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-accent">Usaha aktif</p>
        <h1 className="break-words text-2xl font-bold tracking-tight">
          {active.business.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Anda masuk sebagai {active.role === "OWNER" ? "pemilik" : "staf"}.
        </p>
      </header>
      <section className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Tim usaha</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {members.length} anggota bergabung
            {active.role === "OWNER"
              ? ` · ${invitations.length} undangan menunggu`
              : ""}
            .
          </p>
          <ul className="space-y-3">
            {members.slice(0, 4).map((member) => (
              <li className="break-all text-sm" key={member.id}>
                {member.email}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline">
            <Link href="/pengaturan">
              {active.role === "OWNER"
                ? "Kelola tim dan undangan"
                : "Lihat pengaturan usaha"}
            </Link>
          </Button>
        </div>
        <div className="space-y-4 rounded-2xl bg-muted/50 p-6">
          <h2 className="text-lg font-semibold">Catatan usaha</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Pencatatan transaksi belum terhubung ke usaha Anda. Halaman scan,
            barang, dan transaksi saat ini menyediakan contoh untuk mencoba
            alurnya.
          </p>
          <Button asChild variant="outline">
            <Link href="/scan">Coba alur scan</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
