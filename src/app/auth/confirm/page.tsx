import { Suspense } from "react";
import type { Metadata } from "next";
import { ConfirmEmailForm } from "@/features/auth/ui/confirm-email-form";

export const metadata: Metadata = {
  title: "Konfirmasi email | Onyxa",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type ConfirmationProps = { searchParams: Promise<{ token_hash?: string | string[] }> };

async function ConfirmationContent({ searchParams }: ConfirmationProps) {
  const { token_hash: tokenHash } = await searchParams;
  return <ConfirmEmailForm tokenHash={typeof tokenHash === "string" ? tokenHash : ""} />;
}

export default function ConfirmEmailPage(props: ConfirmationProps) {
  return (
    <Suspense fallback={<p role="status" className="p-6">Memuat konfirmasi...</p>}>
      <ConfirmationContent {...props} />
    </Suspense>
  );
}
