"use client";

import { usePathname } from "next/navigation";

export function DemoNotice() {
  const pathname = usePathname();
  if (
    !["/transaksi", "/dev"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  )
    return null;
  return (
    <p role="status" className="border-b bg-muted/50 px-4 py-3 text-sm sm:px-8">
      Mode contoh: data di halaman ini belum menjadi catatan usaha Anda.
    </p>
  );
}
