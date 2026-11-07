import { InvitationCodeForm } from "./invitation-code-form";

export default function InvitationPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-5 py-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-accent">Onyxa</p>
        <h1 className="text-2xl font-bold">Bergabung dengan usaha</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Gunakan kode rahasia dari pemilik usaha. Masuk atau daftar dengan
          email tujuan undangan. Setelah kode diperiksa, Anda bisa meninjau dan
          menerima undangan.
        </p>
      </header>
      <InvitationCodeForm readLink />
    </main>
  );
}
