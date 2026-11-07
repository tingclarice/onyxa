import { CreateBusinessForm } from "./business-forms";

export function CreateBusinessPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Buat usaha baru</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Anda akan menjadi pemilik dan dapat mengundang anggota setelah usaha
          dibuat.
        </p>
      </header>
      <CreateBusinessForm />
    </div>
  );
}
